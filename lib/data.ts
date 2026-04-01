import { prisma } from "@/lib/prisma";
import {
  calculateDebtProjection,
  getBudgetCycleRange,
  getBudgetCycleRangeFromReference,
  getCreditCardCycleInfo
} from "@/lib/finance";
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
  const previousCycleReferenceDate = new Date(budgetCycle.start.getTime() - 24 * 60 * 60 * 1000);
  const previousBudgetCycle =
    user.billingCycleReferenceStart && user.billingCycleReferenceEnd
      ? getBudgetCycleRangeFromReference(
          previousCycleReferenceDate,
          user.billingCycleReferenceStart,
          user.billingCycleReferenceEnd
        )
      : getBudgetCycleRange(previousCycleReferenceDate, user.billingCycleStartDay, user.billingCycleEndDay);

  const [transactions, cycleTransactions, previousCycleTransactions, allTransactions, debts, reminders, apiTokens] =
    await Promise.all([
    prisma.transaction.findMany({
      where: { userId },
      include: {
        creditCardDebt: {
          select: { name: true }
        }
      },
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
      include: {
        creditCardDebt: {
          select: { name: true }
        }
      },
      orderBy: { transactionAt: "desc" }
    }),
    prisma.transaction.findMany({
      where: {
        userId,
        transactionAt: {
          gte: previousBudgetCycle.start,
          lt: previousBudgetCycle.endExclusive
        }
      },
      include: {
        creditCardDebt: {
          select: { name: true }
        }
      },
      orderBy: { transactionAt: "desc" }
    }),
    prisma.transaction.findMany({
      where: { userId },
      include: {
        creditCardDebt: {
          select: { name: true }
        }
      },
      orderBy: { transactionAt: "desc" }
    }),
    prisma.debt.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: {
        statementSnapshots: {
          orderBy: { statementDate: "desc" },
          take: 6
        },
        transactions: {
          where: {
            paymentMethod: "CREDIT_CARD"
          },
          orderBy: { transactionAt: "desc" }
        },
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

  const cycleBudgetTransactions = cycleTransactions.filter(
    (item) => !(item.paymentMethod === "CREDIT_CARD" && item.type === "EXPENSE")
  );
  const allBudgetTransactions = allTransactions.filter(
    (item) => !(item.paymentMethod === "CREDIT_CARD" && item.type === "EXPENSE")
  );
  const previousCycleBudgetTransactions = previousCycleTransactions.filter(
    (item) => !(item.paymentMethod === "CREDIT_CARD" && item.type === "EXPENSE")
  );

  const totalIncome = cycleBudgetTransactions
    .filter((item) => item.type === "INCOME")
    .reduce((sum, item) => sum + item.amount.toNumber(), 0);

  const totalExpenses = cycleBudgetTransactions
    .filter((item) => item.type === "EXPENSE")
    .reduce((sum, item) => sum + item.amount.toNumber(), 0);

  const totalDebt = debts.reduce((sum, item) => sum + item.currentAmount.toNumber(), 0);
  const cycleExpenseTransactions = cycleBudgetTransactions.filter((item) => item.type === "EXPENSE");
  const cycleIncomeTransactions = cycleBudgetTransactions.filter((item) => item.type === "INCOME");

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
      monthlyTransactionCount: cycleBudgetTransactions.length,
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
    analytics: {
      expenseByCategory: buildBreakdown(cycleExpenseTransactions, (item) => item.category),
      expenseByPaymentMethod: buildBreakdown(cycleExpenseTransactions, (item) => item.paymentMethod),
      topExpenses: cycleExpenseTransactions
        .slice()
        .sort((left, right) => right.amount.toNumber() - left.amount.toNumber())
        .slice(0, 5)
        .map((item) => ({
          ...item,
          amount: item.amount.toNumber()
        })),
      monthlyTrend: buildMonthlyTrend(allBudgetTransactions),
      transactions: allBudgetTransactions.map((item) => ({
        id: item.id,
        description: item.description,
        amount: item.amount.toNumber(),
        type: item.type,
        category: item.category,
        paymentMethod: item.paymentMethod,
        transactionAt: item.transactionAt,
        creditCardDebtName: item.creditCardDebt?.name ?? null
      })),
      comparison: {
        currentCycle: {
          income: totalIncome,
          expense: totalExpenses,
          balance: totalIncome - totalExpenses
        },
        previousCycle: summarizeCycle(previousCycleBudgetTransactions)
      },
      totals: {
        averageExpenseTicket:
          cycleExpenseTransactions.length > 0 ? totalExpenses / cycleExpenseTransactions.length : 0,
        averageIncomeTicket:
          cycleIncomeTransactions.length > 0 ? totalIncome / cycleIncomeTransactions.length : 0,
        expenseCategoryCount: new Set(cycleExpenseTransactions.map((item) => item.category)).size,
        dominantCategory: buildBreakdown(cycleExpenseTransactions, (item) => item.category)[0] ?? null,
        dominantPaymentMethod:
          buildBreakdown(cycleExpenseTransactions, (item) => item.paymentMethod)[0] ?? null
      }
    },
    transactions: transactions.map((item) => ({
      ...item,
      amount: item.amount.toNumber()
    })),
    debts: debts.map((item) => {
      const normalizedTransactions = item.transactions.map((transaction) => ({
        ...transaction,
        amount: transaction.amount.toNumber()
      }));
      const normalizedMonthlyPayment = decimalToNumber(item.monthlyPayment);
      const normalizedMinimumPayment = decimalToNumber(item.minimumPaymentAmount);
      const cardCycleInfo =
        item.type === "CREDIT_CARD"
          ? getCreditCardCycleInfo({
              dueDayOfMonth: item.dueDayOfMonth,
              statementDayOfMonth: item.statementDayOfMonth,
              statementDayPurchasesToNextCycle: item.statementDayPurchasesToNextCycle,
              minimumPaymentAmount: normalizedMinimumPayment,
              currentAmount: item.currentAmount.toNumber()
            })
          : null;

      return {
        ...item,
        initialAmount: item.initialAmount.toNumber(),
        currentAmount: item.currentAmount.toNumber(),
        installmentCount: item.installmentCount,
        startedAt: item.startedAt,
        annualEffectiveRate: decimalToNumber(item.annualEffectiveRate),
        monthlyPayment: normalizedMonthlyPayment,
        creditLimit: decimalToNumber(item.creditLimit),
        minimumPaymentAmount: normalizedMinimumPayment,
        statementDayPurchasesToNextCycle: item.statementDayPurchasesToNextCycle,
        dueDayOfMonth: item.dueDayOfMonth,
        statementDayOfMonth: item.statementDayOfMonth,
        transactions: normalizedTransactions,
        payments: item.payments.map((payment) => ({
          ...payment,
          amount: payment.amount.toNumber(),
          principalAmount: payment.principalAmount.toNumber(),
          interestAmount: payment.interestAmount.toNumber()
        })),
        statementSnapshots: item.statementSnapshots.map((snapshot) => ({
          ...snapshot,
          basePayment: decimalToNumber(snapshot.basePayment),
          bankMinimumPayment: decimalToNumber(snapshot.bankMinimumPayment),
          statementTotal: snapshot.statementTotal.toNumber(),
          projectedPayment: snapshot.projectedPayment.toNumber(),
          paidAmount: snapshot.paidAmount.toNumber(),
          outstandingAmount: snapshot.outstandingAmount.toNumber()
        })),
        cardPurchaseSummary:
          item.type === "CREDIT_CARD"
            ? buildCreditCardPurchaseSummary(normalizedTransactions, {
                basePayment: normalizedMonthlyPayment ?? undefined,
                bankMinimumPayment: normalizedMinimumPayment ?? undefined,
                referenceStatementDate: cardCycleInfo?.nextStatementDate ?? null,
                referencePaymentDate: cardCycleInfo?.nextPaymentDate ?? null
              }, item.payments.map((payment) => ({
                amount: payment.amount.toNumber(),
                paidAt: payment.paidAt
              })))
            : null,
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
          monthlyPayment: normalizedMonthlyPayment,
          creditLimit: decimalToNumber(item.creditLimit),
          minimumPaymentAmount: normalizedMinimumPayment,
          dueDayOfMonth: item.dueDayOfMonth,
          statementDayOfMonth: item.statementDayOfMonth,
          statementDayPurchasesToNextCycle: item.statementDayPurchasesToNextCycle
        })
      };
    }),
    reminders: reminders.map((item) => ({
      ...item,
      amount: decimalToNumber(item.amount)
    })),
    apiTokens
  };
}

function buildBreakdown<T extends { amount: { toNumber(): number } }>(
  items: T[],
  getLabel: (item: T) => string
) {
  const total = items.reduce((sum, item) => sum + item.amount.toNumber(), 0);
  const buckets = new Map<string, { label: string; total: number; count: number }>();

  for (const item of items) {
    const label = getLabel(item);
    const current = buckets.get(label) ?? { label, total: 0, count: 0 };
    current.total += item.amount.toNumber();
    current.count += 1;
    buckets.set(label, current);
  }

  return [...buckets.values()]
    .sort((left, right) => right.total - left.total)
    .map((item) => ({
      ...item,
      share: total > 0 ? item.total / total : 0
    }));
}

function summarizeCycle(
  items: Array<{
    amount: { toNumber(): number };
    type: "INCOME" | "EXPENSE";
  }>
) {
  const income = items
    .filter((item) => item.type === "INCOME")
    .reduce((sum, item) => sum + item.amount.toNumber(), 0);
  const expense = items
    .filter((item) => item.type === "EXPENSE")
    .reduce((sum, item) => sum + item.amount.toNumber(), 0);

  return {
    income,
    expense,
    balance: income - expense
  };
}

function buildMonthlyTrend(
  items: Array<{
    amount: { toNumber(): number };
    type: "INCOME" | "EXPENSE";
    transactionAt: Date;
  }>
) {
  const now = new Date();
  const months = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    return {
      key,
      label: new Intl.DateTimeFormat("es-CO", { month: "short", year: "2-digit" }).format(date),
      income: 0,
      expense: 0
    };
  });

  const monthMap = new Map(months.map((month) => [month.key, month]));

  for (const item of items) {
    const date = new Date(item.transactionAt);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const bucket = monthMap.get(key);

    if (!bucket) {
      continue;
    }

    if (item.type === "INCOME") {
      bucket.income += item.amount.toNumber();
    } else {
      bucket.expense += item.amount.toNumber();
    }
  }

  return months.map((month) => ({
    ...month,
    balance: month.income - month.expense
  }));
}

function buildCreditCardPurchaseSummary(
  transactions: Array<{
    id: string;
    amount: number;
    installmentCount: number | null;
    description: string;
    transactionAt: Date;
    statementDate: Date | null;
    paymentDueDate: Date | null;
    creditCardCycleSelection: "CURRENT_STATEMENT" | "NEXT_STATEMENT" | null;
  }>,
  options: {
    basePayment?: number;
    bankMinimumPayment?: number;
    referenceStatementDate: Date | null;
    referencePaymentDate: Date | null;
  },
  payments: Array<{
    amount: number;
    paidAt: Date;
  }>
) {
  const purchases = transactions.filter((transaction) => transaction.amount > 0);
  const referenceStatementDate = options.referenceStatementDate
    ? toBogotaCalendarDate(options.referenceStatementDate)
    : null;
  const nextStatementDate = referenceStatementDate ? shiftMonthKeepingDay(referenceStatementDate, 1) : null;
  const previousStatementDate = referenceStatementDate ? shiftMonthKeepingDay(referenceStatementDate, -1) : null;
  const referencePaymentDate = options.referencePaymentDate
    ? toBogotaCalendarDate(options.referencePaymentDate)
    : null;
  const previousPaymentDate = referencePaymentDate ? shiftMonthKeepingDay(referencePaymentDate, -1) : null;
  const purchasePlans = purchases
    .map((transaction) => buildPurchasePlan(transaction))
    .filter((plan): plan is NonNullable<typeof plan> => Boolean(plan));
  const currentStatementTotal = referenceStatementDate
    ? purchasePlans.reduce(
        (sum, purchase) =>
          sum + getScheduledAmountForStatement(purchase.installments, referenceStatementDate),
        0
      )
    : 0;
  const nextStatementTotal = nextStatementDate
    ? purchasePlans.reduce(
        (sum, purchase) => sum + getScheduledAmountForStatement(purchase.installments, nextStatementDate),
        0
      )
    : 0;
  const basePayment = options.basePayment ?? 0;
  const bankMinimumPayment = options.bankMinimumPayment ?? 0;
  const currentCyclePayments =
    previousPaymentDate && referencePaymentDate
      ? payments.reduce((sum, payment) => {
          const paidAt = toBogotaCalendarDate(payment.paidAt);
          if (paidAt.getTime() <= previousPaymentDate.getTime() || paidAt.getTime() > referencePaymentDate.getTime()) {
            return sum;
          }

          return sum + payment.amount;
        }, 0)
      : 0;
  const projectedCurrentPayment = basePayment + currentStatementTotal;
  const currentStatementOutstanding = Math.max(0, projectedCurrentPayment - currentCyclePayments);
  const alerts = [
    bankMinimumPayment > 0 && projectedCurrentPayment > bankMinimumPayment
      ? {
          tone: "warning" as const,
          message: `El minimo proyectado ya supera el minimo del banco por ${formatAmount(projectedCurrentPayment - bankMinimumPayment)}.`
        }
      : null,
    currentStatementOutstanding > 0 && referencePaymentDate
      ? {
          tone: "neutral" as const,
          message: `Te faltan ${formatAmount(currentStatementOutstanding)} para cubrir el corte antes del ${formatDateLabel(referencePaymentDate)}.`
        }
      : null,
    basePayment > 0 && currentStatementTotal > basePayment
      ? {
          tone: "warning" as const,
          message: "Las cuotas del corte actual ya van por encima del minimo base configurado."
        }
      : null
  ].filter((item): item is { tone: "warning" | "neutral"; message: string } => Boolean(item));

  return {
    totalPurchased: purchases.reduce((sum, transaction) => sum + transaction.amount, 0),
    previousStatementDate,
    referenceStatementDate,
    nextStatementDate,
    previousPaymentDate,
    referencePaymentDate,
    currentStatementTotal,
    nextStatementTotal,
    currentStatementInstallmentDue: currentStatementTotal,
    nextStatementInstallmentDue: nextStatementTotal,
    currentCyclePayments,
    currentStatementOutstanding,
    basePayment,
    bankMinimumPayment,
    projectedCurrentPayment,
    nextProjectedPayment: basePayment + nextStatementTotal,
    latestPurchases: purchasePlans.slice(0, 5),
    purchases: purchasePlans,
    alerts
  };
}

function buildPurchasePlan(transaction: {
  id: string;
  amount: number;
  installmentCount: number | null;
  description: string;
  creditCardCycleSelection: "CURRENT_STATEMENT" | "NEXT_STATEMENT" | null;
  transactionAt: Date;
  statementDate: Date | null;
  paymentDueDate: Date | null;
}) {
  if (!transaction.statementDate || !transaction.paymentDueDate) {
    return null;
  }

  const normalizedStatementDate = toBogotaCalendarDate(transaction.statementDate);
  const normalizedPaymentDueDate = toBogotaCalendarDate(transaction.paymentDueDate);
  const installments = Math.max(transaction.installmentCount ?? 1, 1);
  const installmentAmount = transaction.amount / installments;

  return {
    id: transaction.id,
    description: transaction.description,
    amount: transaction.amount,
    installmentCount: installments,
    creditCardCycleSelection: transaction.creditCardCycleSelection,
    transactionAt: transaction.transactionAt,
    statementDate: normalizedStatementDate,
    paymentDueDate: normalizedPaymentDueDate,
    installmentAmount,
    installments: Array.from({ length: installments }, (_, index) => ({
      sequence: index + 1,
      statementDate: shiftMonthKeepingDay(normalizedStatementDate, index),
      paymentDueDate: shiftMonthKeepingDay(normalizedPaymentDueDate, index),
      amount: installmentAmount
    }))
  };
}

function getScheduledAmountForStatement(
  installments: Array<{ statementDate: Date; amount: number }>,
  statementDate: Date
) {
  return installments.reduce((sum, installment) => {
    return sameStatementMonth(installment.statementDate, statementDate) ? sum + installment.amount : sum;
  }, 0);
}

function sameStatementMonth(left: Date, right: Date) {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

function shiftMonthKeepingDay(date: Date, months: number) {
  const target = toBogotaCalendarDate(date);
  const day = target.getDate();
  const shifted = new Date(target.getFullYear(), target.getMonth() + months, 1);
  const lastDay = new Date(shifted.getFullYear(), shifted.getMonth() + 1, 0).getDate();
  shifted.setDate(Math.min(day, lastDay));
  shifted.setHours(12, 0, 0, 0);
  return shifted;
}

function formatAmount(value: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0
  }).format(value);
}

function formatDateLabel(value: Date) {
  return new Intl.DateTimeFormat("es-CO", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "short",
    day: "numeric"
  }).format(value);
}

function toBogotaCalendarDate(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);
  const year = Number(parts.find((part) => part.type === "year")?.value ?? "1970");
  const month = Number(parts.find((part) => part.type === "month")?.value ?? "01");
  const day = Number(parts.find((part) => part.type === "day")?.value ?? "01");
  return new Date(year, month - 1, day, 12, 0, 0, 0);
}
