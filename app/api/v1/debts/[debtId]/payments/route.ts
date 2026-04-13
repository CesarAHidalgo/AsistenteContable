import { DebtType } from "@prisma/client";
import { authenticateApiRequest } from "@/lib/auth";
import { debtPaymentPostSchema, parseApiJson } from "@/lib/api-v1-schemas";
import { splitDebtPayment } from "@/lib/finance";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ debtId: string }> }
) {
  const user = await authenticateApiRequest(request);

  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = await parseApiJson(request, debtPaymentPostSchema);
  if (parsed instanceof Response) {
    return parsed;
  }

  const { debtId } = await params;
  const { amount, paidAt } = parsed;

  const debt = await prisma.debt.findFirst({
    where: { id: debtId, userId: user.id }
  });

  if (!debt) {
    return Response.json({ error: "Debt not found" }, { status: 404 });
  }

  const paymentSplit = splitDebtPayment(
    {
      type: debt.type,
      currentAmount: debt.currentAmount.toNumber(),
      startedAt: debt.startedAt,
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
    debt.type === DebtType.CREDIT_CARD
      ? {
          interestAmount: 0,
          principalAmount: Math.min(debt.currentAmount.toNumber(), amount)
        }
      : paymentSplit;

  const paymentDescription =
    debt.type === DebtType.CREDIT_CARD ? `Pago TC: ${debt.name}` : `Abono a deuda: ${debt.name}`;
  const category = debt.type === DebtType.CREDIT_CARD ? "Tarjetas" : "Deudas";

  const [, updatedDebt] = await prisma.$transaction([
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
        description: paymentDescription,
        amount,
        type: "EXPENSE",
        category,
        paymentMethod: "BANK_TRANSFER",
        transactionAt: paidAt
      }
    })
  ]);

  return Response.json({
    ...updatedDebt,
    initialAmount: updatedDebt.initialAmount.toNumber(),
    currentAmount: updatedDebt.currentAmount.toNumber(),
    installmentCount: updatedDebt.installmentCount,
    startedAt: updatedDebt.startedAt,
    annualEffectiveRate: updatedDebt.annualEffectiveRate?.toNumber() ?? null,
    monthlyPayment: updatedDebt.monthlyPayment?.toNumber() ?? null,
    creditLimit: updatedDebt.creditLimit?.toNumber() ?? null,
    minimumPaymentAmount: updatedDebt.minimumPaymentAmount?.toNumber() ?? null,
    dueDayOfMonth: updatedDebt.dueDayOfMonth,
    statementDayOfMonth: updatedDebt.statementDayOfMonth,
    statementDayPurchasesToNextCycle: updatedDebt.statementDayPurchasesToNextCycle
  });
}
