import { prisma } from "@/lib/prisma";
import { calculateDebtProjection, getBudgetCycleRange } from "@/lib/finance";
import { decimalToNumber } from "@/lib/serializers";

export async function getDashboardData(userId: string) {
  const [user, transactions, debts, reminders, apiTokens] = await Promise.all([
    prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        billingCycleStartDay: true,
        billingCycleEndDay: true
      }
    }),
    prisma.transaction.findMany({
      where: { userId },
      orderBy: { transactionAt: "desc" },
      take: 50
    }),
    prisma.debt.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: {
        payments: {
          orderBy: { paidAt: "desc" }
        }
      }
    }),
    prisma.reminder.findMany({
      where: { userId },
      orderBy: { dueDate: "asc" },
      take: 8
    }),
    prisma.apiToken.findMany({
      where: { userId, revokedAt: null },
      orderBy: { createdAt: "desc" }
    })
  ]);

  const budgetCycle = getBudgetCycleRange(
    new Date(),
    user.billingCycleStartDay,
    user.billingCycleEndDay
  );
  const monthlyTransactions = transactions.filter((item) => {
    const date = new Date(item.transactionAt);
    return date >= budgetCycle.start && date < budgetCycle.endExclusive;
  });

  const totalIncome = monthlyTransactions
    .filter((item) => item.type === "INCOME")
    .reduce((sum, item) => sum + item.amount.toNumber(), 0);

  const totalExpenses = monthlyTransactions
    .filter((item) => item.type === "EXPENSE")
    .reduce((sum, item) => sum + item.amount.toNumber(), 0);

  const totalDebt = debts.reduce((sum, item) => sum + item.currentAmount.toNumber(), 0);

  const dueSoon = reminders.filter((item) => {
    const diff = new Date(item.dueDate).getTime() - Date.now();
    return diff / (1000 * 60 * 60 * 24) <= 5;
  });

  return {
    summary: {
      totalIncome,
      totalExpenses,
      totalDebt,
      balance: totalIncome - totalExpenses,
      monthlyTransactionCount: monthlyTransactions.length,
      activeDebtCount: debts.filter((item) => item.currentAmount.toNumber() > 0).length,
      pendingReminderCount: reminders.filter((item) => !item.isCompleted).length,
      cycleStartLabel: budgetCycle.start.toISOString(),
      cycleEndLabel: budgetCycle.end.toISOString(),
      cycleStartDay: budgetCycle.cycleStartDay,
      cycleEndDay: budgetCycle.cycleEndDay
    },
    alerts: {
      highSpend: totalIncome > 0 && totalExpenses / totalIncome >= 0.85,
      noIncome: totalExpenses > 0 && totalIncome === 0,
      dueSoonCount: dueSoon.length
    },
    transactions: transactions.map((item) => ({
      ...item,
      amount: item.amount.toNumber()
    })),
    debts: debts.map((item) => ({
      ...item,
      initialAmount: item.initialAmount.toNumber(),
      currentAmount: item.currentAmount.toNumber(),
      startedAt: item.startedAt,
      annualEffectiveRate: decimalToNumber(item.annualEffectiveRate),
      monthlyPayment: decimalToNumber(item.monthlyPayment),
      creditLimit: decimalToNumber(item.creditLimit),
      minimumPaymentRate: decimalToNumber(item.minimumPaymentRate),
      payments: item.payments.map((payment) => ({
        ...payment,
        amount: payment.amount.toNumber(),
        principalAmount: payment.principalAmount.toNumber(),
        interestAmount: payment.interestAmount.toNumber()
      })),
      projection: calculateDebtProjection({
        type: item.type,
        currentAmount: item.currentAmount.toNumber(),
        startedAt: item.startedAt,
        annualEffectiveRate: decimalToNumber(item.annualEffectiveRate),
        monthlyPayment: decimalToNumber(item.monthlyPayment),
        creditLimit: decimalToNumber(item.creditLimit),
        minimumPaymentRate: decimalToNumber(item.minimumPaymentRate)
      })
    })),
    reminders: reminders.map((item) => ({
      ...item,
      amount: decimalToNumber(item.amount)
    })),
    apiTokens
  };
}
