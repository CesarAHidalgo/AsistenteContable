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
      billingCycleEndDay: 31
    }
  });

  redirect("/login?message=Cuenta%20creada.%20Ahora%20puedes%20iniciar%20sesion");
}

export async function createTransactionAction(formData: FormData) {
  const user = await requireUser();

  await prisma.transaction.create({
    data: {
      userId: user.id,
      description: requiredString(formData.get("description")),
      amount: parseAmount(formData.get("amount")),
      type: requiredString(formData.get("type")) as TransactionType,
      category: requiredString(formData.get("category")),
      paymentMethod: requiredString(formData.get("paymentMethod")) as PaymentMethod,
      transactionAt: new Date(requiredString(formData.get("transactionAt")))
    }
  });

  revalidatePath("/");
}

export async function createDebtAction(formData: FormData) {
  const user = await requireUser();
  const initialAmount = parseAmount(formData.get("initialAmount"));
  const currentAmount = parseAmount(formData.get("currentAmount")) || initialAmount;
  const monthlyPayment = parseAmount(formData.get("monthlyPayment"));
  const annualEffectiveRate = parseAmount(formData.get("annualEffectiveRate"));
  const creditLimit = parseAmount(formData.get("creditLimit"));
  const minimumPaymentRate = parseAmount(formData.get("minimumPaymentRate"));
  const dueDay = Number(formData.get("dueDayOfMonth") || 0);
  const statementDay = Number(formData.get("statementDayOfMonth") || 0);

  await prisma.debt.create({
    data: {
      userId: user.id,
      name: requiredString(formData.get("name")),
      type: requiredString(formData.get("type")) as DebtType,
      initialAmount,
      currentAmount,
      startedAt: formData.get("startedAt") ? new Date(requiredString(formData.get("startedAt"))) : null,
      annualEffectiveRate: annualEffectiveRate || null,
      monthlyPayment: monthlyPayment || null,
      creditLimit: creditLimit || null,
      minimumPaymentRate: minimumPaymentRate || null,
      dueDayOfMonth: dueDay || null,
      statementDayOfMonth: statementDay || null
    }
  });

  revalidatePath("/");
}

export async function updateBillingCycleAction(formData: FormData) {
  const user = await requireUser();
  const cycleStartDay = Number(formData.get("billingCycleStartDay") || 1);
  const cycleEndDay = Number(formData.get("billingCycleEndDay") || 31);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      billingCycleStartDay: Math.min(31, Math.max(1, cycleStartDay)),
      billingCycleEndDay: Math.min(31, Math.max(1, cycleEndDay))
    }
  });

  revalidatePath("/");
}

export async function createReminderAction(formData: FormData) {
  const user = await requireUser();
  const amount = parseAmount(formData.get("amount"));

  await prisma.reminder.create({
    data: {
      userId: user.id,
      title: requiredString(formData.get("title")),
      amount: amount || null,
      dueDate: new Date(requiredString(formData.get("dueDate")))
    }
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
      minimumPaymentRate: debt.minimumPaymentRate?.toNumber() ?? null
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
