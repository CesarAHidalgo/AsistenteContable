import { PaymentMethod, TransactionType } from "@prisma/client";
import { authenticateApiRequest } from "@/lib/auth";
import { parseApiJson, transactionPostSchema } from "@/lib/api-v1-schemas";
import { getCreditCardPurchaseCycle } from "@/lib/finance";
import { logError, logInfo, logWarn } from "@/lib/observability";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const user = await authenticateApiRequest(request);

    if (!user) {
      logWarn("api.transactions.get.unauthorized", { route: "/api/v1/transactions" });
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const transactions = await prisma.transaction.findMany({
      where: { userId: user.id },
      include: {
        creditCardDebt: {
          select: { name: true }
        }
      },
      orderBy: { transactionAt: "desc" },
      take: 50
    });

    logInfo("api.transactions.get.success", {
      route: "/api/v1/transactions",
      userId: user.id,
      count: transactions.length
    });

    return Response.json(
      transactions.map((item) => ({
        ...item,
        amount: item.amount.toNumber()
      }))
    );
  } catch (error) {
    logError("api.transactions.get.failed", error, { route: "/api/v1/transactions" });
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await authenticateApiRequest(request);

    if (!user) {
      logWarn("api.transactions.post.unauthorized", { route: "/api/v1/transactions" });
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const parsed = await parseApiJson(request, transactionPostSchema);
    if (parsed instanceof Response) {
      return parsed;
    }

    const body = parsed;
    const paymentMethod = body.paymentMethod;
    const amount = body.amount;
    const transactionAt = body.transactionAt ?? new Date();
    const transactionType = body.type;

    let transaction;

    if (paymentMethod === PaymentMethod.CREDIT_CARD) {
      const creditCardDebtId = body.creditCardDebtId;

      const debt = await prisma.debt.findFirst({
        where: {
          id: creditCardDebtId,
          userId: user.id,
          type: "CREDIT_CARD"
        }
      });

      if (!debt) {
        return Response.json({ error: "Credit card debt not found" }, { status: 404 });
      }

      const cycleSelection = body.creditCardCycleSelection ?? "CURRENT_STATEMENT";
      const purchaseCycle = getCreditCardPurchaseCycle(
        {
          dueDayOfMonth: debt.dueDayOfMonth,
          statementDayOfMonth: debt.statementDayOfMonth,
          statementDayPurchasesToNextCycle: debt.statementDayPurchasesToNextCycle
        },
        transactionAt,
        cycleSelection
      );

      const result = await prisma.$transaction(async (tx) => {
        const createdTransaction = await tx.transaction.create({
          data: {
            user: {
              connect: { id: user.id }
            },
            description: body.description,
            amount,
            type: transactionType,
            category: body.category,
            paymentMethod,
            installmentCount: body.installmentCount ?? null,
            creditCardDebt: {
              connect: { id: creditCardDebtId }
            },
            creditCardCycleSelection: cycleSelection,
            statementDate: purchaseCycle?.statementDate ?? null,
            paymentDueDate: purchaseCycle?.paymentDueDate ?? null,
            transactionAt
          }
        });

        await tx.debt.update({
          where: { id: debt.id },
          data: {
            currentAmount:
              transactionType === TransactionType.EXPENSE
                ? debt.currentAmount.toNumber() + amount
                : debt.currentAmount
          }
        });

        return createdTransaction;
      });

      transaction = result;
    } else {
      transaction = await prisma.transaction.create({
        data: {
          user: {
            connect: { id: user.id }
          },
          description: body.description,
          amount,
          type: transactionType,
          category: body.category,
          paymentMethod,
          installmentCount: body.installmentCount ?? null,
          transactionAt
        }
      });
    }

    logInfo("api.transactions.post.success", {
      route: "/api/v1/transactions",
      userId: user.id,
      transactionId: transaction.id,
      paymentMethod,
      type: transactionType,
      amount
    });

    return Response.json(
      {
        ...transaction,
        amount: transaction.amount.toNumber()
      },
      { status: 201 }
    );
  } catch (error) {
    logError("api.transactions.post.failed", error, { route: "/api/v1/transactions" });
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
