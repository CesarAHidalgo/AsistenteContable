import { prisma } from "@/lib/prisma";
import { calculateDebtProjection, getBudgetCycleRange, getBudgetCycleRangeFromReference } from "@/lib/finance";
import { decimalToNumber } from "@/lib/serializers";

export async function getDashboardData(userId: string) {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: {
      billingCycleStartDay: true,
      billingCycleEndDay: true,
      billingCycleReferenceStart: true,
      billingCycleReferenceEnd: true
    }
  });

  const budgetCycle =
    user.billingCycleReferenceStart && user.billingCycleReferenceEnd
      ? getBudgetCycleRangeFromReference(
          new Date(),
          user.billingCycleReferenceStart,
          user.billingCycleReferenceEnd
        )
      : getBudgetCycleRange(new Date(), user.billingCycleStartDay, user.billingCycleEndDay);

  const [transactions, cycleTransactions, debts, reminders, apiTokens] = await Promise.all([
    prisma.transaction.findMany({
      where: { userId },
      orderBy: { transactionAt: "desc" },
      take: 50
    }),
    prisma.transaction.findMany({
      where: {
        userId,
        transactionAt: {
          gte: budgetCycle.start,
          lt: budgetCycle.endExclusive
        }
      },
      orderBy: { transactionAt: "desc" }
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
      orderBy: [{ isCompleted: "asc" }, { dueDate: "asc" }],
      take: 20
    }),
    prisma.apiToken.findMany({
      where: { userId, revokedAt: null },
      orderBy: { createdAt: "desc" }
    })
  ]);

  const totalIncome = cycleTransactions
    .filter((item) => item.type === "INCOME")
    .reduce((sum, item) => sum + item.amount.toNumber(), 0);

  const totalExpenses = cycleTransactions
    .filter((item) => item.type === "EXPENSE")
    .reduce((sum, item) => sum + item.amount.toNumber(), 0);

  const totalDebt = debts.reduce((sum, item) => sum + item.currentAmount.toNumber(), 0);

  const dueSoon = reminders.filter((item) => {
    if (item.isCompleted) {
      return false;
    }

    if (item.type === "ALARM" && item.notificationAt) {
      const diff = new Date(item.notificationAt).getTime() - Date.now();
      const diffDays = diff / (1000 * 60 * 60 * 24);
      return diffDays >= 0 && diffDays <= 5;
    }

    const diff = new Date(item.dueDate).getTime() - Date.now();
    const diffDays = diff / (1000 * 60 * 60 * 24);
    return diffDays >= 0 && diffDays <= (item.notifyDaysBefore || 5);
  });

  return {
    summary: {
      totalIncome,
      totalExpenses,
      totalDebt,
      balance: totalIncome - totalExpenses,
      monthlyTransactionCount: cycleTransactions.length,
      activeDebtCount: debts.filter((item) => item.currentAmount.toNumber() > 0).length,
      pendingReminderCount: reminders.filter((item) => !item.isCompleted).length,
      cycleStartLabel: budgetCycle.start.toISOString(),
      cycleEndLabel: budgetCycle.end.toISOString(),
      cycleStartDay: budgetCycle.cycleStartDay,
      cycleEndDay: budgetCycle.cycleEndDay,
      cycleReferenceStart: budgetCycle.start.toISOString().slice(0, 10),
      cycleReferenceEnd: budgetCycle.end.toISOString().slice(0, 10)
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
      installmentCount: item.installmentCount,
      startedAt: item.startedAt,
      annualEffectiveRate: decimalToNumber(item.annualEffectiveRate),
      monthlyPayment: decimalToNumber(item.monthlyPayment),
      creditLimit: decimalToNumber(item.creditLimit),
      minimumPaymentAmount: decimalToNumber(item.minimumPaymentAmount),
      statementDayPurchasesToNextCycle: item.statementDayPurchasesToNextCycle,
      dueDayOfMonth: item.dueDayOfMonth,
      statementDayOfMonth: item.statementDayOfMonth,
      payments: item.payments.map((payment) => ({
        ...payment,
        amount: payment.amount.toNumber(),
        principalAmount: payment.principalAmount.toNumber(),
        interestAmount: payment.interestAmount.toNumber()
      })),
      totalPaidAmount: item.initialAmount.toNumber() - item.currentAmount.toNumber(),
      totalPrincipalPaid: item.initialAmount.toNumber() - item.currentAmount.toNumber(),
      totalInterestPaid: item.payments.reduce(
        (sum, payment) => sum + payment.interestAmount.toNumber(),
        0
      ),
      projection: calculateDebtProjection({
        type: item.type,
        currentAmount: item.currentAmount.toNumber(),
        installmentCount: item.installmentCount,
        startedAt: item.startedAt,
        annualEffectiveRate: decimalToNumber(item.annualEffectiveRate),
        monthlyPayment: decimalToNumber(item.monthlyPayment),
        creditLimit: decimalToNumber(item.creditLimit),
        minimumPaymentAmount: decimalToNumber(item.minimumPaymentAmount),
        dueDayOfMonth: item.dueDayOfMonth,
        statementDayOfMonth: item.statementDayOfMonth,
        statementDayPurchasesToNextCycle: item.statementDayPurchasesToNextCycle
      })
    })),
    reminders: reminders.map((item) => ({
      ...item,
      amount: decimalToNumber(item.amount)
    })),
    apiTokens
  };
}
