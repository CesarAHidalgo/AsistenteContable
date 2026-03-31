import { prisma } from "@/lib/prisma";
import { decimalToNumber } from "@/lib/serializers";

export async function getDashboardData(userId: string) {
  const [transactions, debts, reminders, apiTokens] = await Promise.all([
    prisma.transaction.findMany({
      where: { userId },
      orderBy: { transactionAt: "desc" },
      take: 12
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

  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const monthlyTransactions = transactions.filter((item) => {
    const date = new Date(item.transactionAt);
    return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
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
      balance: totalIncome - totalExpenses
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
      monthlyPayment: decimalToNumber(item.monthlyPayment),
      payments: item.payments.map((payment) => ({
        ...payment,
        amount: payment.amount.toNumber()
      }))
    })),
    reminders: reminders.map((item) => ({
      ...item,
      amount: decimalToNumber(item.amount)
    })),
    apiTokens
  };
}
