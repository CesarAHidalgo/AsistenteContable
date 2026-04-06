"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { DebtType, PaymentMethod, TransactionType } from "@prisma/client";
import { requireUser } from "@/lib/auth";
import { generateOpaqueToken, hashPassword, hashToken } from "@/lib/crypto";
import { getCreditCardPurchaseCycle, splitDebtPayment } from "@/lib/finance";
import { logInfo } from "@/lib/observability";
import { prisma } from "@/lib/prisma";
import {
  dispatchReminderNotifications,
  sendTestEmail,
  verifySmtpConnection
} from "@/lib/reminder-notifications";

function parseAmount(value: FormDataEntryValue | null) {
  return Number(value ?? 0);
}

function parseNullableAmount(value: FormDataEntryValue | null) {
  const text = requiredString(value);
  return text === "" ? null : Number(text);
}

function requiredString(value: FormDataEntryValue | null) {
  return String(value ?? "").trim();
}

function rawString(value: FormDataEntryValue | null) {
  return String(value ?? "");
}

function checked(value: FormDataEntryValue | null) {
  return value === "on" || value === "true";
}

function getRedirectTab(formData: FormData, fallback: string) {
  return requiredString(formData.get("redirectTab")) || fallback;
}

function redirectWithFeedback(
  tab: string,
  status: "success" | "warning" | "error",
  message: string
): never {
  revalidatePath("/");
  redirect(`/?tab=${tab}&status=${status}&message=${encodeURIComponent(message)}`);
}

export async function registerAction(formData: FormData) {
  const name = requiredString(formData.get("name"));
  const email = requiredString(formData.get("email")).toLowerCase();
  const password = rawString(formData.get("password"));
  const confirmPassword = rawString(formData.get("confirmPassword"));

  if (password !== confirmPassword) {
    redirect("/registro?error=Las%20contrase%C3%B1as%20no%20coinciden");
  }

  const existingUser = await prisma.user.findUnique({
    where: { email }
  });

  if (existingUser) {
    redirect("/registro?error=Ya%20existe%20un%20usuario%20con%20ese%20correo");
  }

  await prisma.user.create({
    data: {
      name,
      email,
      passwordHash: hashPassword(password),
      billingCycleStartDay: 1,
      billingCycleEndDay: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate(),
      billingCycleReferenceStart: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
      billingCycleReferenceEnd: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0)
    }
  });

  redirect("/login?message=Cuenta%20creada.%20Ahora%20puedes%20iniciar%20sesi%C3%B3n");
}

export async function createTransactionAction(formData: FormData) {
  const user = await requireUser();
  const redirectTab = getRedirectTab(formData, "transactions");
  const installmentCount = Number(formData.get("installmentCount") || 0);
  const paymentMethod = requiredString(formData.get("paymentMethod")) as PaymentMethod;
  const transactionAt = new Date(requiredString(formData.get("transactionAt")));
  const amount = parseAmount(formData.get("amount"));
  const transactionType = requiredString(formData.get("type")) as TransactionType;
  const creditCardDebtId = requiredString(formData.get("creditCardDebtId")) || null;
  const cycleSelection =
    requiredString(formData.get("creditCardCycleSelection")) as "CURRENT_STATEMENT" | "NEXT_STATEMENT";

  if (paymentMethod === "CREDIT_CARD") {
    if (!creditCardDebtId) {
      redirectWithFeedback(redirectTab, "warning", "Selecciona la tarjeta para guardar la compra.");
    }

    const debt = await prisma.debt.findFirst({
      where: {
        id: creditCardDebtId,
        userId: user.id,
        type: "CREDIT_CARD"
      }
    });

    if (!debt) {
      redirectWithFeedback(redirectTab, "warning", "No encontramos la tarjeta seleccionada.");
    }

    const purchaseCycle = getCreditCardPurchaseCycle(
      {
        dueDayOfMonth: debt.dueDayOfMonth,
        statementDayOfMonth: debt.statementDayOfMonth,
        statementDayPurchasesToNextCycle: debt.statementDayPurchasesToNextCycle
      },
      transactionAt,
      cycleSelection || "CURRENT_STATEMENT"
    );

    await prisma.$transaction([
      prisma.transaction.create({
        data: {
          user: {
            connect: { id: user.id }
          },
          description: requiredString(formData.get("description")),
          amount,
          type: transactionType,
          category: requiredString(formData.get("category")),
          paymentMethod,
          installmentCount: installmentCount > 0 ? installmentCount : null,
          creditCardDebt: {
            connect: { id: creditCardDebtId }
          },
          creditCardCycleSelection: cycleSelection || "CURRENT_STATEMENT",
          statementDate: purchaseCycle?.statementDate ?? null,
          paymentDueDate: purchaseCycle?.paymentDueDate ?? null,
          transactionAt
        }
      }),
      prisma.debt.update({
        where: { id: debt.id },
        data: {
          currentAmount:
            transactionType === "EXPENSE" ? debt.currentAmount.toNumber() + amount : debt.currentAmount
        }
      })
    ]);

    logInfo("action.transaction.created", {
      userId: user.id,
      paymentMethod,
      transactionType,
      amount,
      creditCardDebtId
    });

    redirectWithFeedback(redirectTab, "success", `Movimiento guardado: ${requiredString(formData.get("description"))}.`);
  }

  await prisma.transaction.create({
    data: {
      user: {
        connect: { id: user.id }
      },
      description: requiredString(formData.get("description")),
      amount,
      type: transactionType,
      category: requiredString(formData.get("category")),
      paymentMethod,
      installmentCount: installmentCount > 0 ? installmentCount : null,
      transactionAt
    }
  });

  logInfo("action.transaction.created", {
    userId: user.id,
    paymentMethod,
    transactionType,
    amount
  });

  redirectWithFeedback(redirectTab, "success", `Movimiento guardado: ${requiredString(formData.get("description"))}.`);
}

export async function updateTransactionAction(formData: FormData) {
  const user = await requireUser();
  const redirectTab = getRedirectTab(formData, "transactions");
  const transactionId = requiredString(formData.get("transactionId"));
  const existingTransaction = await prisma.transaction.findFirst({
    where: { id: transactionId, userId: user.id },
    include: {
      creditCardDebt: {
        select: { id: true, name: true }
      }
    }
  });

  if (!existingTransaction) {
    redirectWithFeedback(redirectTab, "warning", "No encontramos el movimiento que intentas editar.");
  }

  const newDescription = requiredString(formData.get("description"));
  const newAmount = parseAmount(formData.get("amount"));
  const newType = requiredString(formData.get("type")) as TransactionType;
  const newCategory = requiredString(formData.get("category"));
  const newTransactionAt = new Date(requiredString(formData.get("transactionAt")));
  const newInstallmentCount = Number(formData.get("installmentCount") || 0);
  const newPaymentMethod = requiredString(formData.get("paymentMethod")) as PaymentMethod;
  const creditCardDebtName = requiredString(formData.get("creditCardDebtName")) || null;

  await prisma.$transaction(async (tx) => {
    if (existingTransaction.paymentMethod === "CREDIT_CARD" && existingTransaction.type === "EXPENSE") {
      const originalDebtName = existingTransaction.creditCardDebt?.name ?? creditCardDebtName;
      if (originalDebtName) {
        const originalDebt = await tx.debt.findFirst({
          where: { userId: user.id, name: originalDebtName, type: "CREDIT_CARD" }
        });

        if (originalDebt) {
          const newCardExpense = newPaymentMethod === "CREDIT_CARD" && newType === "EXPENSE" ? newAmount : 0;
          const oldCardExpense = existingTransaction.amount.toNumber();
          await tx.debt.update({
            where: { id: originalDebt.id },
            data: {
              currentAmount: Math.max(0, originalDebt.currentAmount.toNumber() + newCardExpense - oldCardExpense)
            }
          });
        }
      }
    }

    await tx.transaction.update({
      where: { id: existingTransaction.id },
      data: {
        description: newDescription,
        amount: newAmount,
        type: newType,
        category: newCategory,
        paymentMethod: newPaymentMethod,
        installmentCount: newInstallmentCount > 0 ? newInstallmentCount : null,
        transactionAt: newTransactionAt
      }
    });
  });

  redirectWithFeedback(redirectTab, "success", `Movimiento actualizado: ${newDescription}.`);
}

export async function deleteTransactionAction(formData: FormData) {
  const user = await requireUser();
  const redirectTab = getRedirectTab(formData, "transactions");
  const transactionId = requiredString(formData.get("transactionId"));
  const existingTransaction = await prisma.transaction.findFirst({
    where: { id: transactionId, userId: user.id },
    include: {
      creditCardDebt: {
        select: { id: true, name: true }
      }
    }
  });

  if (!existingTransaction) {
    redirectWithFeedback(redirectTab, "warning", "No encontramos el movimiento que intentas eliminar.");
  }

  await prisma.$transaction(async (tx) => {
    if (existingTransaction.paymentMethod === "CREDIT_CARD" && existingTransaction.type === "EXPENSE") {
      const debtName = existingTransaction.creditCardDebt?.name;
      if (debtName) {
        const debt = await tx.debt.findFirst({
          where: { userId: user.id, name: debtName, type: "CREDIT_CARD" }
        });

        if (debt) {
          await tx.debt.update({
            where: { id: debt.id },
            data: {
              currentAmount: Math.max(0, debt.currentAmount.toNumber() - existingTransaction.amount.toNumber())
            }
          });
        }
      }
    }

    await tx.transaction.delete({
      where: { id: existingTransaction.id }
    });
  });

  redirectWithFeedback(redirectTab, "success", `Movimiento eliminado: ${existingTransaction.description}.`);
}

export async function createDebtAction(formData: FormData) {
  const user = await requireUser();
  const redirectTab = getRedirectTab(formData, "debts");
  const requestedType = requiredString(formData.get("type")) as DebtType;
  const rawInitialAmount = parseAmount(formData.get("initialAmount"));
  const currentAmount = parseAmount(formData.get("currentAmount")) || rawInitialAmount;
  const initialAmount =
    requestedType === "CREDIT_CARD" ? rawInitialAmount || currentAmount : rawInitialAmount;
  const monthlyPayment = parseAmount(formData.get("monthlyPayment"));
  const annualEffectiveRate = parseAmount(formData.get("annualEffectiveRate"));
  const creditLimit = parseAmount(formData.get("creditLimit"));
  const minimumPaymentAmount = parseAmount(formData.get("minimumPaymentAmount"));
  const installmentCount = Number(formData.get("installmentCount") || 0);
  const dueDay = Number(formData.get("dueDayOfMonth") || 0);
  const statementDay = Number(formData.get("statementDayOfMonth") || 0);
  const statementDayPurchasesToNextCycle =
    requiredString(formData.get("statementDayPurchasesToNextCycle")) === "true";

  await prisma.debt.create({
    data: {
      userId: user.id,
      name: requiredString(formData.get("name")),
      type: requestedType,
      initialAmount,
      currentAmount,
      installmentCount: installmentCount > 0 ? installmentCount : null,
      startedAt: formData.get("startedAt") ? new Date(requiredString(formData.get("startedAt"))) : null,
      annualEffectiveRate: annualEffectiveRate || null,
      monthlyPayment: monthlyPayment || null,
      creditLimit: creditLimit || null,
      minimumPaymentAmount: minimumPaymentAmount || null,
      dueDayOfMonth: dueDay || null,
      statementDayOfMonth: statementDay || null,
      statementDayPurchasesToNextCycle
    }
  });

  logInfo("action.debt.created", {
    userId: user.id,
    type: requestedType,
    currentAmount,
    initialAmount
  });

  redirectWithFeedback(redirectTab, "success", `Deuda creada: ${requiredString(formData.get("name"))}.`);
}

export async function updateDebtAction(formData: FormData) {
  const user = await requireUser();
  const redirectTab = getRedirectTab(formData, "debts");
  const debtId = requiredString(formData.get("debtId"));
  const requestedType = requiredString(formData.get("type")) as DebtType;
  const rawInitialAmount = parseAmount(formData.get("initialAmount"));
  const currentAmount = parseAmount(formData.get("currentAmount")) || rawInitialAmount;
  const initialAmount =
    requestedType === "CREDIT_CARD" ? rawInitialAmount || currentAmount : rawInitialAmount;
  const monthlyPayment = parseNullableAmount(formData.get("monthlyPayment"));
  const annualEffectiveRate = parseNullableAmount(formData.get("annualEffectiveRate"));
  const creditLimit = parseNullableAmount(formData.get("creditLimit"));
  const minimumPaymentAmount = parseNullableAmount(formData.get("minimumPaymentAmount"));
  const installmentCount = Number(formData.get("installmentCount") || 0);
  const dueDay = Number(formData.get("dueDayOfMonth") || 0);
  const statementDay = Number(formData.get("statementDayOfMonth") || 0);
  const statementDayPurchasesToNextCycle =
    requiredString(formData.get("statementDayPurchasesToNextCycle")) === "true";
  const startedAtRaw = requiredString(formData.get("startedAt"));
  const startedAt = startedAtRaw ? new Date(startedAtRaw) : null;

  await prisma.debt.updateMany({
    where: { id: debtId, userId: user.id },
    data: {
      name: requiredString(formData.get("name")),
      type: requestedType,
      initialAmount,
      currentAmount,
      installmentCount: installmentCount > 0 ? installmentCount : null,
      startedAt,
      annualEffectiveRate,
      monthlyPayment,
      creditLimit,
      minimumPaymentAmount,
      dueDayOfMonth: dueDay || null,
      statementDayOfMonth: statementDay || null,
      statementDayPurchasesToNextCycle
    }
  });

  redirectWithFeedback(redirectTab, "success", `Deuda actualizada: ${requiredString(formData.get("name"))}.`);
}

export async function deleteDebtAction(formData: FormData) {
  const user = await requireUser();
  const redirectTab = getRedirectTab(formData, "debts");
  const debtId = requiredString(formData.get("debtId"));
  const debt = await prisma.debt.findFirst({
    where: { id: debtId, userId: user.id },
    include: { payments: true }
  });

  if (!debt) {
    redirectWithFeedback(redirectTab, "warning", "No encontramos la deuda que intentas eliminar.");
  }

  await prisma.$transaction(async (tx) => {
    const paymentLabels = [`Abono a deuda: ${debt.name}`, `Pago TC: ${debt.name}`];
    await tx.transaction.deleteMany({
      where: {
        userId: user.id,
        description: { in: paymentLabels }
      }
    });

    await tx.debtPayment.deleteMany({
      where: {
        debtId: debt.id
      }
    });

    await tx.debt.delete({
      where: { id: debt.id }
    });
  });

  redirectWithFeedback(redirectTab, "success", `Deuda eliminada: ${debt.name}.`);
}

export async function updateDebtPlanningAction(formData: FormData) {
  const user = await requireUser();
  const redirectTab = getRedirectTab(formData, "debts");
  const debtId = requiredString(formData.get("debtId"));
  const monthlyPayment = parseAmount(formData.get("monthlyPayment"));
  const minimumPaymentAmount = parseAmount(formData.get("minimumPaymentAmount"));

  await prisma.debt.updateMany({
    where: { id: debtId, userId: user.id },
    data: {
      monthlyPayment: monthlyPayment || null,
      minimumPaymentAmount: minimumPaymentAmount || null
    }
  });

  const debt = await prisma.debt.findFirst({
    where: { id: debtId, userId: user.id },
    select: { name: true }
  });

  redirectWithFeedback(redirectTab, "success", `Planeación actualizada para ${debt?.name ?? "la deuda"}.`);
}

export async function closeCreditCardStatementAction(formData: FormData) {
  const user = await requireUser();
  const redirectTab = getRedirectTab(formData, "cards");
  const debtId = requiredString(formData.get("debtId"));
  const statementDateRaw = requiredString(formData.get("statementDate"));
  const paymentDueDateRaw = requiredString(formData.get("paymentDueDate"));
  const providedStatementTotal = parseNullableAmount(formData.get("statementTotal"));
  const providedProjectedPayment = parseNullableAmount(formData.get("projectedPayment"));
  const providedPaidAmount = parseNullableAmount(formData.get("paidAmount"));
  const providedOutstandingAmount = parseNullableAmount(formData.get("outstandingAmount"));
  const providedPurchaseCount = Number(formData.get("purchaseCount") || 0);

  if (!statementDateRaw) {
    redirectWithFeedback(redirectTab, "warning", "Indica la fecha del corte que deseas cerrar.");
  }

  const debt = await prisma.debt.findFirst({
    where: {
      id: debtId,
      userId: user.id,
      type: "CREDIT_CARD"
    },
    include: {
      transactions: {
        where: {
          paymentMethod: "CREDIT_CARD",
          type: "EXPENSE"
        }
      },
      payments: true
    }
  });

  if (!debt) {
    redirectWithFeedback(redirectTab, "warning", "No encontramos la tarjeta que intentas cerrar.");
  }

  const statementDate = new Date(statementDateRaw);
  const paymentDueDate = paymentDueDateRaw ? new Date(paymentDueDateRaw) : null;

  const statementTransactions = debt.transactions.filter((transaction) => {
    if (!transaction.statementDate) {
      return false;
    }

    return transaction.statementDate.toISOString().slice(0, 10) === statementDate.toISOString().slice(0, 10);
  });

  const statementTotal = statementTransactions.reduce(
    (sum, transaction) => sum + transaction.amount.toNumber() / Math.max(transaction.installmentCount ?? 1, 1),
    0
  );
  const projectedPayment = (debt.monthlyPayment?.toNumber() ?? 0) + statementTotal;
  const paidAmount =
    paymentDueDate && debt.payments.length > 0
      ? debt.payments.reduce((sum, payment) => {
          if (payment.paidAt.getTime() > paymentDueDate.getTime()) {
            return sum;
          }

          return sum + payment.amount.toNumber();
        }, 0)
      : 0;
  const outstandingAmount = Math.max(0, projectedPayment - paidAmount);
  const snapshotStatementTotal = providedStatementTotal ?? statementTotal;
  const snapshotProjectedPayment = providedProjectedPayment ?? projectedPayment;
  const snapshotPaidAmount = providedPaidAmount ?? paidAmount;
  const snapshotOutstandingAmount = providedOutstandingAmount ?? outstandingAmount;
  const snapshotPurchaseCount = providedPurchaseCount > 0 ? providedPurchaseCount : statementTransactions.length;

  await prisma.creditCardStatementSnapshot.upsert({
    where: {
      debtId_statementDate: {
        debtId: debt.id,
        statementDate
      }
    },
    update: {
      paymentDueDate,
      basePayment: debt.monthlyPayment?.toNumber() ?? null,
      bankMinimumPayment: debt.minimumPaymentAmount?.toNumber() ?? null,
      statementTotal: snapshotStatementTotal,
      projectedPayment: snapshotProjectedPayment,
      paidAmount: snapshotPaidAmount,
      outstandingAmount: snapshotOutstandingAmount,
      purchaseCount: snapshotPurchaseCount,
      closedAt: new Date()
    },
    create: {
      debtId: debt.id,
      statementDate,
      paymentDueDate,
      basePayment: debt.monthlyPayment?.toNumber() ?? null,
      bankMinimumPayment: debt.minimumPaymentAmount?.toNumber() ?? null,
      statementTotal: snapshotStatementTotal,
      projectedPayment: snapshotProjectedPayment,
      paidAmount: snapshotPaidAmount,
      outstandingAmount: snapshotOutstandingAmount,
      purchaseCount: snapshotPurchaseCount,
      closedAt: new Date()
    }
  });

  logInfo("action.credit_card_statement.closed", {
    userId: user.id,
    debtId: debt.id,
    statementDate: statementDate.toISOString(),
    purchaseCount: snapshotPurchaseCount,
    projectedPayment: snapshotProjectedPayment
  });

  redirectWithFeedback(redirectTab, "success", `Corte guardado para ${debt.name}.`);
}

export async function updateCreditCardPurchaseInstallmentsAction(formData: FormData) {
  const user = await requireUser();
  const redirectTab = getRedirectTab(formData, "cards");
  const transactionIds = formData
    .getAll("transactionIds")
    .map((value) => String(value))
    .filter(Boolean);
  const installmentCount = Number(formData.get("installmentCount") || 0);

  if (!transactionIds.length || installmentCount <= 0) {
    redirectWithFeedback(redirectTab, "warning", "Selecciona al menos una compra y define un número de cuotas válido.");
  }

  await prisma.transaction.updateMany({
    where: {
      id: { in: transactionIds },
      userId: user.id,
      paymentMethod: "CREDIT_CARD"
    },
    data: {
      installmentCount
    }
  });

  redirectWithFeedback(
    redirectTab,
    "success",
    `Cuotas actualizadas para ${transactionIds.length} compra(s).`
  );
}

export async function updateCreditCardPurchaseAction(formData: FormData) {
  const user = await requireUser();
  const redirectTab = getRedirectTab(formData, "cards");
  const transactionId = requiredString(formData.get("transactionId"));
  const description = requiredString(formData.get("description"));
  const amount = parseAmount(formData.get("amount"));
  const installmentCount = Number(formData.get("installmentCount") || 1);
  const transactionAt = new Date(requiredString(formData.get("transactionAt")));
  const creditCardDebtId = requiredString(formData.get("creditCardDebtId"));
  const cycleSelection =
    requiredString(formData.get("creditCardCycleSelection")) as "CURRENT_STATEMENT" | "NEXT_STATEMENT";

  const existingTransaction = await prisma.transaction.findFirst({
    where: {
      id: transactionId,
      userId: user.id,
      paymentMethod: "CREDIT_CARD"
    }
  });

  if (!existingTransaction) {
    redirectWithFeedback(redirectTab, "warning", "No encontramos la compra de tarjeta que intentas editar.");
  }

  const targetDebt = await prisma.debt.findFirst({
    where: {
      id: creditCardDebtId,
      userId: user.id,
      type: "CREDIT_CARD"
    }
  });

  if (!targetDebt) {
    redirectWithFeedback(redirectTab, "warning", "No encontramos la tarjeta seleccionada para la compra.");
  }

  const purchaseCycle = getCreditCardPurchaseCycle(
    {
      dueDayOfMonth: targetDebt.dueDayOfMonth,
      statementDayOfMonth: targetDebt.statementDayOfMonth,
      statementDayPurchasesToNextCycle: targetDebt.statementDayPurchasesToNextCycle
    },
    transactionAt,
    cycleSelection || "CURRENT_STATEMENT"
  );

  const oldDebtId = existingTransaction.creditCardDebtId;
  const amountDifference = amount - existingTransaction.amount.toNumber();

  await prisma.$transaction(async (tx) => {
    await tx.transaction.update({
      where: { id: existingTransaction.id },
      data: {
        description,
        amount,
        installmentCount: installmentCount > 0 ? installmentCount : 1,
        transactionAt,
        creditCardDebtId,
        creditCardCycleSelection: cycleSelection || "CURRENT_STATEMENT",
        statementDate: purchaseCycle?.statementDate ?? null,
        paymentDueDate: purchaseCycle?.paymentDueDate ?? null
      }
    });

    if (oldDebtId && oldDebtId !== creditCardDebtId) {
      const oldDebt = await tx.debt.findUnique({ where: { id: oldDebtId } });
      if (oldDebt) {
        await tx.debt.update({
          where: { id: oldDebtId },
          data: {
            currentAmount: Math.max(0, oldDebt.currentAmount.toNumber() - existingTransaction.amount.toNumber())
          }
        });
      }

      await tx.debt.update({
        where: { id: creditCardDebtId },
        data: {
          currentAmount: targetDebt.currentAmount.toNumber() + amount
        }
      });
    } else {
      await tx.debt.update({
        where: { id: creditCardDebtId },
        data: {
          currentAmount: Math.max(0, targetDebt.currentAmount.toNumber() + amountDifference)
        }
      });
    }
  });

  redirectWithFeedback(redirectTab, "success", `Compra actualizada: ${description}.`);
}

export async function updateBillingCycleAction(formData: FormData) {
  const user = await requireUser();
  const redirectTab = getRedirectTab(formData, "overview");
  const cycleStartDate = new Date(requiredString(formData.get("billingCycleReferenceStart")));
  const cycleEndDate = new Date(requiredString(formData.get("billingCycleReferenceEnd")));

  if (Number.isNaN(cycleStartDate.getTime()) || Number.isNaN(cycleEndDate.getTime()) || cycleStartDate >= cycleEndDate) {
    redirectWithFeedback(redirectTab, "warning", "El ciclo debe tener una fecha de inicio anterior a la fecha final.");
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      billingCycleStartDay: cycleStartDate.getDate(),
      billingCycleEndDay: cycleEndDate.getDate(),
      billingCycleReferenceStart: cycleStartDate,
      billingCycleReferenceEnd: cycleEndDate
    }
  });

  redirectWithFeedback(redirectTab, "success", "Ciclo de facturación actualizado.");
}

export async function createReminderAction(formData: FormData) {
  const user = await requireUser();
  const redirectTab = getRedirectTab(formData, "reminders");
  const amount = parseAmount(formData.get("amount"));
  const type = requiredString(formData.get("type")) as "PAYMENT" | "ALARM";
  const dueDate = new Date(requiredString(formData.get("dueDate")));
  const notificationAtRaw = requiredString(formData.get("notificationAt"));
  const notificationAt = notificationAtRaw ? new Date(notificationAtRaw) : null;
  const notifyDaysBefore = Number(formData.get("notifyDaysBefore") || 5);

  await prisma.reminder.create({
    data: {
      userId: user.id,
      title: requiredString(formData.get("title")),
      type,
      amount: amount || null,
      dueDate,
      notificationAt: type === "ALARM" ? notificationAt : null,
      notifyDaysBefore: type === "PAYMENT" ? notifyDaysBefore : 0,
      notifyEmail: checked(formData.get("notifyEmail")),
      notifyPush: checked(formData.get("notifyPush")),
      notifyWhatsApp: checked(formData.get("notifyWhatsApp"))
    }
  });

  logInfo("action.reminder.created", {
    userId: user.id,
    type,
    dueDate: dueDate.toISOString(),
    notifyEmail: checked(formData.get("notifyEmail")),
    notifyPush: checked(formData.get("notifyPush")),
    notifyWhatsApp: checked(formData.get("notifyWhatsApp"))
  });

  redirectWithFeedback(redirectTab, "success", `Recordatorio creado: ${requiredString(formData.get("title"))}.`);
}

export async function updateReminderAction(formData: FormData) {
  const user = await requireUser();
  const redirectTab = getRedirectTab(formData, "reminders");
  const reminderId = requiredString(formData.get("reminderId"));
  const amount = parseAmount(formData.get("amount"));
  const type = requiredString(formData.get("type")) as "PAYMENT" | "ALARM";
  const dueDate = new Date(requiredString(formData.get("dueDate")));
  const notificationAtRaw = requiredString(formData.get("notificationAt"));
  const notificationAt = notificationAtRaw ? new Date(notificationAtRaw) : null;
  const notifyDaysBefore = Number(formData.get("notifyDaysBefore") || 5);

  await prisma.reminder.updateMany({
    where: { id: reminderId, userId: user.id },
    data: {
      title: requiredString(formData.get("title")),
      type,
      amount: amount || null,
      dueDate,
      notificationAt: type === "ALARM" ? notificationAt : null,
      notifyDaysBefore: type === "PAYMENT" ? notifyDaysBefore : 0,
      notifyEmail: checked(formData.get("notifyEmail")),
      notifyPush: checked(formData.get("notifyPush")),
      notifyWhatsApp: checked(formData.get("notifyWhatsApp")),
      lastNotifiedAt: null
    }
  });

  redirectWithFeedback(redirectTab, "success", `Recordatorio actualizado: ${requiredString(formData.get("title"))}.`);
}

export async function toggleReminderCompletionAction(formData: FormData) {
  const user = await requireUser();
  const redirectTab = getRedirectTab(formData, "reminders");
  const reminderId = requiredString(formData.get("reminderId"));
  const nextState = requiredString(formData.get("nextState")) === "true";

  await prisma.reminder.updateMany({
    where: { id: reminderId, userId: user.id },
    data: {
      isCompleted: nextState,
      completedAt: nextState ? new Date() : null,
      paymentRecordedAt: nextState ? new Date() : null
    }
  });

  redirectWithFeedback(
    redirectTab,
    "success",
    nextState ? "Recordatorio marcado como completado." : "Recordatorio vuelto a pendiente."
  );
}

export async function deleteReminderAction(formData: FormData) {
  const user = await requireUser();
  const redirectTab = getRedirectTab(formData, "reminders");
  const reminderId = requiredString(formData.get("reminderId"));

  await prisma.reminder.deleteMany({
    where: { id: reminderId, userId: user.id }
  });

  redirectWithFeedback(redirectTab, "success", "Recordatorio eliminado.");
}

export async function createDebtPaymentAction(formData: FormData) {
  const user = await requireUser();
  const redirectTab = getRedirectTab(formData, "debts");
  const debtId = requiredString(formData.get("debtId"));
  const amount = parseAmount(formData.get("amount"));
  const paidAt = new Date(requiredString(formData.get("paidAt")));

  const debt = await prisma.debt.findFirst({
    where: { id: debtId, userId: user.id }
  });

  if (!debt) {
    redirectWithFeedback(redirectTab, "warning", "No encontramos la deuda a la que quieres aplicar el pago.");
  }

  const paymentSplit = splitDebtPayment(
    {
      type: debt.type,
      currentAmount: debt.currentAmount.toNumber(),
      annualEffectiveRate: debt.annualEffectiveRate?.toNumber() ?? null,
      monthlyPayment: debt.monthlyPayment?.toNumber() ?? null,
      creditLimit: debt.creditLimit?.toNumber() ?? null,
      minimumPaymentAmount: debt.minimumPaymentAmount?.toNumber() ?? null,
      dueDayOfMonth: debt.dueDayOfMonth,
      statementDayOfMonth: debt.statementDayOfMonth,
      statementDayPurchasesToNextCycle: debt.statementDayPurchasesToNextCycle
    },
    amount
  );
  const effectivePaymentSplit =
    debt.type === "CREDIT_CARD"
      ? {
          interestAmount: 0,
          principalAmount: Math.min(debt.currentAmount.toNumber(), amount)
        }
      : paymentSplit;

  await prisma.$transaction([
    prisma.debtPayment.create({
      data: {
        debtId,
        amount,
        principalAmount: effectivePaymentSplit.principalAmount,
        interestAmount: effectivePaymentSplit.interestAmount,
        paidAt
      }
    }),
    prisma.debt.update({
      where: { id: debtId },
      data: {
        currentAmount: Math.max(0, debt.currentAmount.toNumber() - effectivePaymentSplit.principalAmount)
      }
    }),
    prisma.transaction.create({
      data: {
        userId: user.id,
        description: debt.type === "CREDIT_CARD" ? `Pago TC: ${debt.name}` : `Abono a deuda: ${debt.name}`,
        amount,
        type: "EXPENSE",
        category: debt.type === "CREDIT_CARD" ? "Tarjetas" : "Deudas",
        paymentMethod: "BANK_TRANSFER",
        transactionAt: paidAt
      }
    })
  ]);

  logInfo("action.debt_payment.created", {
    userId: user.id,
    debtId,
    debtType: debt.type,
    amount,
    paidAt: paidAt.toISOString()
  });

  redirectWithFeedback(redirectTab, "success", `Pago registrado para ${debt.name}.`);
}

export async function updateDebtPaymentAction(formData: FormData) {
  const user = await requireUser();
  const redirectTab = getRedirectTab(formData, "debts");
  const paymentId = requiredString(formData.get("paymentId"));
  const debtId = requiredString(formData.get("debtId"));
  const amount = parseAmount(formData.get("amount"));
  const paidAt = new Date(requiredString(formData.get("paidAt")));

  const debt = await prisma.debt.findFirst({
    where: { id: debtId, userId: user.id },
    include: { payments: true }
  });

  if (!debt) {
    redirectWithFeedback(redirectTab, "warning", "No encontramos la deuda del pago que intentas editar.");
  }

  const existingPayment = debt.payments.find((payment) => payment.id === paymentId);
  if (!existingPayment) {
    redirectWithFeedback(redirectTab, "warning", "No encontramos el pago que intentas editar.");
  }

  const restoredAmount = debt.currentAmount.toNumber() + existingPayment.principalAmount.toNumber();
  const paymentSplit =
    debt.type === "CREDIT_CARD"
      ? {
          principalAmount: Math.min(restoredAmount, amount),
          interestAmount: 0
        }
      : splitDebtPayment(
          {
            type: debt.type,
            currentAmount: restoredAmount,
            annualEffectiveRate: debt.annualEffectiveRate?.toNumber() ?? null,
            monthlyPayment: debt.monthlyPayment?.toNumber() ?? null,
            creditLimit: debt.creditLimit?.toNumber() ?? null,
            minimumPaymentAmount: debt.minimumPaymentAmount?.toNumber() ?? null,
            dueDayOfMonth: debt.dueDayOfMonth,
            statementDayOfMonth: debt.statementDayOfMonth,
            statementDayPurchasesToNextCycle: debt.statementDayPurchasesToNextCycle
          },
          amount
        );

  await prisma.$transaction(async (tx) => {
    await tx.debtPayment.update({
      where: { id: existingPayment.id },
      data: {
        amount,
        principalAmount: paymentSplit.principalAmount,
        interestAmount: paymentSplit.interestAmount,
        paidAt
      }
    });

    await tx.debt.update({
      where: { id: debt.id },
      data: {
        currentAmount: Math.max(0, restoredAmount - paymentSplit.principalAmount)
      }
    });

    const paymentDescription = debt.type === "CREDIT_CARD" ? `Pago TC: ${debt.name}` : `Abono a deuda: ${debt.name}`;
    const relatedTransaction = await tx.transaction.findFirst({
      where: {
        userId: user.id,
        description: paymentDescription,
        amount: existingPayment.amount,
        transactionAt: existingPayment.paidAt,
        type: "EXPENSE"
      }
    });

    if (relatedTransaction) {
      await tx.transaction.update({
        where: { id: relatedTransaction.id },
        data: {
          amount,
          transactionAt: paidAt
        }
      });
    }
  });

  redirectWithFeedback(redirectTab, "success", `Pago actualizado para ${debt.name}.`);
}

export async function deleteDebtPaymentAction(formData: FormData) {
  const user = await requireUser();
  const redirectTab = getRedirectTab(formData, "debts");
  const paymentId = requiredString(formData.get("paymentId"));
  const debtId = requiredString(formData.get("debtId"));

  const debt = await prisma.debt.findFirst({
    where: { id: debtId, userId: user.id },
    include: { payments: true }
  });

  if (!debt) {
    redirectWithFeedback(redirectTab, "warning", "No encontramos la deuda del pago que intentas eliminar.");
  }

  const existingPayment = debt.payments.find((payment) => payment.id === paymentId);
  if (!existingPayment) {
    redirectWithFeedback(redirectTab, "warning", "No encontramos el pago que intentas eliminar.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.debt.update({
      where: { id: debt.id },
      data: {
        currentAmount: debt.currentAmount.toNumber() + existingPayment.principalAmount.toNumber()
      }
    });

    await tx.debtPayment.delete({
      where: { id: existingPayment.id }
    });

    const paymentDescription = debt.type === "CREDIT_CARD" ? `Pago TC: ${debt.name}` : `Abono a deuda: ${debt.name}`;
    const relatedTransaction = await tx.transaction.findFirst({
      where: {
        userId: user.id,
        description: paymentDescription,
        amount: existingPayment.amount,
        transactionAt: existingPayment.paidAt,
        type: "EXPENSE"
      }
    });

    if (relatedTransaction) {
      await tx.transaction.delete({
        where: { id: relatedTransaction.id }
      });
    }
  });

  redirectWithFeedback(redirectTab, "success", `Pago eliminado de ${debt.name}.`);
}

export async function createApiTokenAction(formData: FormData) {
  const user = await requireUser();
  const name = requiredString(formData.get("name"));
  const rawToken = `ac_${generateOpaqueToken(24)}`;

  await prisma.apiToken.create({
    data: {
      userId: user.id,
      name,
      tokenHash: hashToken(rawToken)
    }
  });

  redirect(`/integraciones?token=${encodeURIComponent(rawToken)}`);
}

export async function revokeApiTokenAction(formData: FormData) {
  const user = await requireUser();
  const tokenId = requiredString(formData.get("tokenId"));

  await prisma.apiToken.updateMany({
    where: { id: tokenId, userId: user.id },
    data: { revokedAt: new Date() }
  });

  revalidatePath("/integraciones");
}

export async function verifySmtpAction() {
  const user = await requireUser();
  const result = await verifySmtpConnection();

  logInfo("action.smtp.verify", {
    userId: user.id,
    ok: result.ok
  });

  redirect(`/integraciones?message=${encodeURIComponent(result.message)}&status=${result.ok ? "success" : "warning"}`);
}

export async function sendTestEmailAction() {
  const user = await requireUser();
  const result = await sendTestEmail(user.email);

  logInfo("action.smtp.test_email", {
    userId: user.id,
    ok: result.ok
  });

  redirect(`/integraciones?message=${encodeURIComponent(result.message)}&status=${result.ok ? "success" : "warning"}`);
}

export async function dispatchRemindersNowAction() {
  const user = await requireUser();
  const summary = await dispatchReminderNotifications();

  logInfo("action.reminders.dispatch_now", {
    userId: user.id,
    ...summary
  });

  redirect(
    `/integraciones?message=${encodeURIComponent(
      `Despacho ejecutado. Evaluados: ${summary.evaluated}, enviados: ${summary.sent}, omitidos: ${summary.skipped}, fallidos: ${summary.failed}`
    )}&status=${summary.failed > 0 ? "warning" : "success"}`
  );
}
