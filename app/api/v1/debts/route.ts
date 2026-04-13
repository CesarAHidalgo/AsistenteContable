import { authenticateApiRequest } from "@/lib/auth";
import { debtPostSchema, parseApiJson } from "@/lib/api-v1-schemas";
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
      installmentCount: item.installmentCount,
      startedAt: item.startedAt,
      annualEffectiveRate: item.annualEffectiveRate?.toNumber() ?? null,
      monthlyPayment: item.monthlyPayment?.toNumber() ?? null,
      creditLimit: item.creditLimit?.toNumber() ?? null,
      minimumPaymentAmount: item.minimumPaymentAmount?.toNumber() ?? null,
      dueDayOfMonth: item.dueDayOfMonth,
      statementDayOfMonth: item.statementDayOfMonth,
      statementDayPurchasesToNextCycle: item.statementDayPurchasesToNextCycle,
      projection: calculateDebtProjection({
        type: item.type,
        currentAmount: item.currentAmount.toNumber(),
        startedAt: item.startedAt,
        annualEffectiveRate: item.annualEffectiveRate?.toNumber() ?? null,
        monthlyPayment: item.monthlyPayment?.toNumber() ?? null,
        creditLimit: item.creditLimit?.toNumber() ?? null,
        minimumPaymentAmount: item.minimumPaymentAmount?.toNumber() ?? null,
        dueDayOfMonth: item.dueDayOfMonth,
        statementDayOfMonth: item.statementDayOfMonth,
        statementDayPurchasesToNextCycle: item.statementDayPurchasesToNextCycle
      })
    }))
  );
}

export async function POST(request: Request) {
  const user = await authenticateApiRequest(request);

  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = await parseApiJson(request, debtPostSchema);
  if (parsed instanceof Response) {
    return parsed;
  }

  const body = parsed;
  const initialAmount = body.initialAmount;
  const currentAmount = body.currentAmount ?? initialAmount;

  const debt = await prisma.debt.create({
    data: {
      userId: user.id,
      name: body.name,
      type: body.type,
      initialAmount,
      currentAmount,
      installmentCount: body.installmentCount ?? null,
      startedAt: body.startedAt ?? null,
      annualEffectiveRate: body.annualEffectiveRate ?? null,
      monthlyPayment: body.monthlyPayment ?? null,
      creditLimit: body.creditLimit ?? null,
      minimumPaymentAmount: body.minimumPaymentAmount ?? null,
      dueDayOfMonth: body.dueDayOfMonth ?? null,
      statementDayOfMonth: body.statementDayOfMonth ?? null,
      statementDayPurchasesToNextCycle: body.statementDayPurchasesToNextCycle ?? true
    }
  });

  return Response.json(
    {
      ...debt,
      initialAmount: debt.initialAmount.toNumber(),
      currentAmount: debt.currentAmount.toNumber(),
      installmentCount: debt.installmentCount,
      startedAt: debt.startedAt,
      annualEffectiveRate: debt.annualEffectiveRate?.toNumber() ?? null,
      monthlyPayment: debt.monthlyPayment?.toNumber() ?? null,
      creditLimit: debt.creditLimit?.toNumber() ?? null,
      minimumPaymentAmount: debt.minimumPaymentAmount?.toNumber() ?? null,
      dueDayOfMonth: debt.dueDayOfMonth,
      statementDayOfMonth: debt.statementDayOfMonth,
      statementDayPurchasesToNextCycle: debt.statementDayPurchasesToNextCycle
    },
    { status: 201 }
  );
}
