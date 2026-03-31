import { authenticateApiRequest } from "@/lib/auth";
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

  const [, updatedDebt] = await prisma.$transaction([
    prisma.debtPayment.create({
      data: {
        debtId,
        amount,
        paidAt
      }
    }),
    prisma.debt.update({
      where: { id: debtId },
      data: {
        currentAmount: Math.max(0, debt.currentAmount.toNumber() - amount)
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
    monthlyPayment: updatedDebt.monthlyPayment?.toNumber() ?? null
  });
}
