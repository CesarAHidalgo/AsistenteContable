"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { DebtType, PaymentMethod, TransactionType } from "@prisma/client";
import { requireUser } from "@/lib/auth";
import { generateOpaqueToken, hashPassword, hashToken } from "@/lib/crypto";
import { splitDebtPayment } from "@/lib/finance";
import { prisma } from "@/lib/prisma";

function parseAmount(value: FormDataEntryValue | null) {
  return Number(value ?? 0);
}

function requiredString(value: FormDataEntryValue | null) {
  return String(value ?? "").trim();
}

function checked(value: FormDataEntryValue | null) {
  return value === "on" || value === "true";
}

export async function registerAction(formData: FormData) {
  const name = requiredString(formData.get("name"));
  const email = requiredString(formData.get("email")).toLowerCase();
  const password = requiredString(formData.get("password"));
  const confirmPassword = requiredString(formData.get("confirmPassword"));

  if (password !== confirmPassword) {
    redirect("/registro?error=Las%20contrasenas%20no%20coinciden");
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

  redirect("/login?message=Cuenta%20creada.%20Ahora%20puedes%20iniciar%20sesion");
}

export async function createTransactionAction(formData: FormData) {
  const user = await requireUser();
  const installmentCount = Number(formData.get("installmentCount") || 0);

  await prisma.transaction.create({
    data: {
      userId: user.id,
      description: requiredString(formData.get("description")),
      amount: parseAmount(formData.get("amount")),
      type: requiredString(formData.get("type")) as TransactionType,
      category: requiredString(formData.get("category")),
      paymentMethod: requiredString(formData.get("paymentMethod")) as PaymentMethod,
      installmentCount: installmentCount > 0 ? installmentCount : null,
      transactionAt: new Date(requiredString(formData.get("transactionAt")))
    }
  });

  revalidatePath("/");
}

export async function createDebtAction(formData: FormData) {
  const user = await requireUser();
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

  revalidatePath("/");
}

export async function updateBillingCycleAction(formData: FormData) {
  const user = await requireUser();
  const cycleStartDate = new Date(requiredString(formData.get("billingCycleReferenceStart")));
  const cycleEndDate = new Date(requiredString(formData.get("billingCycleReferenceEnd")));

  if (Number.isNaN(cycleStartDate.getTime()) || Number.isNaN(cycleEndDate.getTime()) || cycleStartDate >= cycleEndDate) {
    redirect("/?error=invalid-cycle-range");
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

  revalidatePath("/");
}

export async function createReminderAction(formData: FormData) {
  const user = await requireUser();
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

  revalidatePath("/");
}

export async function updateReminderAction(formData: FormData) {
  const user = await requireUser();
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

  revalidatePath("/");
}

export async function toggleReminderCompletionAction(formData: FormData) {
  const user = await requireUser();
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

  revalidatePath("/");
}

export async function deleteReminderAction(formData: FormData) {
  const user = await requireUser();
  const reminderId = requiredString(formData.get("reminderId"));

  await prisma.reminder.deleteMany({
    where: { id: reminderId, userId: user.id }
  });

  revalidatePath("/");
}

export async function createDebtPaymentAction(formData: FormData) {
  const user = await requireUser();
  const debtId = requiredString(formData.get("debtId"));
  const amount = parseAmount(formData.get("amount"));
  const paidAt = new Date(requiredString(formData.get("paidAt")));

  const debt = await prisma.debt.findFirst({
    where: { id: debtId, userId: user.id }
  });

  if (!debt) {
    redirect("/?error=debt-not-found");
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

  await prisma.$transaction([
    prisma.debtPayment.create({
      data: {
        debtId,
        amount,
        principalAmount: paymentSplit.principalAmount,
        interestAmount: paymentSplit.interestAmount,
        paidAt
      }
    }),
    prisma.debt.update({
      where: { id: debtId },
      data: {
        currentAmount: Math.max(0, debt.currentAmount.toNumber() - paymentSplit.principalAmount)
      }
    }),
    prisma.transaction.create({
      data: {
        userId: user.id,
        description: `Abono a deuda: ${debt.name}`,
        amount,
        type: "EXPENSE",
        category: "Deudas",
        paymentMethod: "BANK_TRANSFER",
        transactionAt: paidAt
      }
    })
  ]);

  revalidatePath("/");
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
