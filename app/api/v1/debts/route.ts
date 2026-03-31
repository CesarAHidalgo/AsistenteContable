import { authenticateApiRequest } from "@/lib/auth";
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
      monthlyPayment: item.monthlyPayment?.toNumber() ?? null
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

  const debt = await prisma.debt.create({
    data: {
      userId: user.id,
      name: String(body.name ?? ""),
      initialAmount,
      currentAmount: Number(body.currentAmount ?? initialAmount),
      monthlyPayment: body.monthlyPayment ? Number(body.monthlyPayment) : null,
      dueDayOfMonth: body.dueDayOfMonth ? Number(body.dueDayOfMonth) : null
    }
  });

  return Response.json(
    {
      ...debt,
      initialAmount: debt.initialAmount.toNumber(),
      currentAmount: debt.currentAmount.toNumber(),
      monthlyPayment: debt.monthlyPayment?.toNumber() ?? null
    },
    { status: 201 }
  );
}
