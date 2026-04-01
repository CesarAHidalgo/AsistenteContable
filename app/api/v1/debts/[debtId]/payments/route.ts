import { authenticateApiRequest } from "@/lib/auth";
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

  const { debtId } = await params;
  const body = await request.json();
  const amount = Number(body.amount ?? 0);
  const paidAt = new Date(String(body.paidAt ?? new Date().toISOString()));

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

  const [, updatedDebt] = await prisma.$transaction([
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
