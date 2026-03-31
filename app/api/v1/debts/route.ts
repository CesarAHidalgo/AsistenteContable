import { DebtType } from "@prisma/client";
import { authenticateApiRequest } from "@/lib/auth";
import { calculateDebtProjection } from "@/lib/finance";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const user = await authenticateApiRequest(request);

  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const debts = await prisma.debt.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" }
  });

  return Response.json(
    debts.map((item) => ({
      ...item,
      initialAmount: item.initialAmount.toNumber(),
      currentAmount: item.currentAmount.toNumber(),
      startedAt: item.startedAt,
      annualEffectiveRate: item.annualEffectiveRate?.toNumber() ?? null,
      monthlyPayment: item.monthlyPayment?.toNumber() ?? null,
      creditLimit: item.creditLimit?.toNumber() ?? null,
      minimumPaymentRate: item.minimumPaymentRate?.toNumber() ?? null,
      projection: calculateDebtProjection({
        type: item.type,
        currentAmount: item.currentAmount.toNumber(),
        startedAt: item.startedAt,
        annualEffectiveRate: item.annualEffectiveRate?.toNumber() ?? null,
        monthlyPayment: item.monthlyPayment?.toNumber() ?? null,
        creditLimit: item.creditLimit?.toNumber() ?? null,
        minimumPaymentRate: item.minimumPaymentRate?.toNumber() ?? null
      })
    }))
  );
}

export async function POST(request: Request) {
  const user = await authenticateApiRequest(request);

  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const initialAmount = Number(body.initialAmount ?? 0);
  const currentAmount = Number(body.currentAmount ?? initialAmount);

  const debt = await prisma.debt.create({
    data: {
      userId: user.id,
      name: String(body.name ?? ""),
      type: String(body.type ?? "FIXED_INSTALLMENT") as DebtType,
      initialAmount,
      currentAmount,
      startedAt: body.startedAt ? new Date(body.startedAt) : null,
      annualEffectiveRate: body.annualEffectiveRate ? Number(body.annualEffectiveRate) : null,
      monthlyPayment: body.monthlyPayment ? Number(body.monthlyPayment) : null,
      creditLimit: body.creditLimit ? Number(body.creditLimit) : null,
      minimumPaymentRate: body.minimumPaymentRate ? Number(body.minimumPaymentRate) : null,
      dueDayOfMonth: body.dueDayOfMonth ? Number(body.dueDayOfMonth) : null,
      statementDayOfMonth: body.statementDayOfMonth ? Number(body.statementDayOfMonth) : null
    }
  });

  return Response.json(
    {
      ...debt,
      initialAmount: debt.initialAmount.toNumber(),
      currentAmount: debt.currentAmount.toNumber(),
      startedAt: debt.startedAt,
      annualEffectiveRate: debt.annualEffectiveRate?.toNumber() ?? null,
      monthlyPayment: debt.monthlyPayment?.toNumber() ?? null,
      creditLimit: debt.creditLimit?.toNumber() ?? null,
      minimumPaymentRate: debt.minimumPaymentRate?.toNumber() ?? null
    },
    { status: 201 }
  );
}
