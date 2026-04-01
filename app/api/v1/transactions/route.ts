import { PaymentMethod, TransactionType } from "@prisma/client";
import { authenticateApiRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const user = await authenticateApiRequest(request);

  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const transactions = await prisma.transaction.findMany({
    where: { userId: user.id },
    orderBy: { transactionAt: "desc" },
    take: 50
  });

  return Response.json(
    transactions.map((item) => ({
      ...item,
      amount: item.amount.toNumber()
    }))
  );
}

export async function POST(request: Request) {
  const user = await authenticateApiRequest(request);

  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const transaction = await prisma.transaction.create({
    data: {
      userId: user.id,
      description: String(body.description ?? ""),
      amount: Number(body.amount ?? 0),
      type: String(body.type ?? "EXPENSE") as TransactionType,
      category: String(body.category ?? "Otros"),
      paymentMethod: String(body.paymentMethod ?? "OTHER") as PaymentMethod,
      installmentCount: body.installmentCount ? Number(body.installmentCount) : null,
      transactionAt: new Date(String(body.transactionAt ?? new Date().toISOString()))
    }
  });

  return Response.json(
    {
      ...transaction,
      amount: transaction.amount.toNumber()
    },
    { status: 201 }
  );
}
