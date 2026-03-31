import { DebtType } from "@prisma/client";

type DebtLike = {
  type: DebtType;
  currentAmount: number;
  annualEffectiveRate: number | null;
  monthlyPayment: number | null;
  creditLimit: number | null;
  minimumPaymentRate: number | null;
  startedAt?: Date | string | null;
};

export function annualEffectiveToMonthlyRate(annualRate: number | null) {
  if (!annualRate || annualRate <= 0) {
    return 0;
  }

  return Math.pow(1 + annualRate / 100, 1 / 12) - 1;
}

export function getBudgetCycleRange(referenceDate: Date, cycleStartDay: number, cycleEndDay: number) {
  const normalizedStartDay = Math.min(31, Math.max(1, cycleStartDay || 1));
  const normalizedEndDay = Math.min(31, Math.max(1, cycleEndDay || 31));
  const ref = new Date(referenceDate);
  const year = ref.getFullYear();
  const month = ref.getMonth();
  const wrapsAcrossMonths = normalizedStartDay > normalizedEndDay;

  let start: Date;
  let endInclusive: Date;

  if (wrapsAcrossMonths) {
    const startsThisMonth = ref.getDate() >= normalizedStartDay;
    start = startsThisMonth
      ? createClampedDate(year, month, normalizedStartDay)
      : createClampedDate(year, month - 1, normalizedStartDay);
    endInclusive = startsThisMonth
      ? createClampedDate(year, month + 1, normalizedEndDay)
      : createClampedDate(year, month, normalizedEndDay);
  } else {
    const insideCurrentWindow =
      ref.getDate() >= normalizedStartDay && ref.getDate() <= normalizedEndDay;
    start = insideCurrentWindow
      ? createClampedDate(year, month, normalizedStartDay)
      : ref.getDate() < normalizedStartDay
        ? createClampedDate(year, month - 1, normalizedStartDay)
        : createClampedDate(year, month + 1, normalizedStartDay);
    endInclusive = insideCurrentWindow
      ? createClampedDate(year, month, normalizedEndDay)
      : ref.getDate() < normalizedStartDay
        ? createClampedDate(year, month - 1, normalizedEndDay)
        : createClampedDate(year, month + 1, normalizedEndDay);
  }

  start.setHours(0, 0, 0, 0);
  endInclusive.setHours(23, 59, 59, 999);

  return {
    start,
    end: endInclusive,
    endExclusive: new Date(endInclusive.getTime() + 1),
    cycleStartDay: normalizedStartDay,
    cycleEndDay: normalizedEndDay
  };
}

export function calculateDebtProjection(debt: DebtLike) {
  const balance = Math.max(0, debt.currentAmount);
  const monthlyRate = annualEffectiveToMonthlyRate(debt.annualEffectiveRate);
  const estimatedInterest = roundCurrency(balance * monthlyRate);
  const configuredPayment =
    debt.type === "FIXED_INSTALLMENT"
      ? debt.monthlyPayment ?? 0
      : estimateMinimumPayment(debt, estimatedInterest);
  const normalizedPayment = Math.max(0, configuredPayment);
  const principalComponent = roundCurrency(
    Math.min(balance, Math.max(0, normalizedPayment - estimatedInterest))
  );
  const nextBalance = roundCurrency(Math.max(0, balance - principalComponent));
  const payoffMonths = principalComponent > 0 ? Math.ceil(balance / principalComponent) : null;
  const utilization =
    debt.creditLimit && debt.creditLimit > 0
      ? Math.min(999, (balance / debt.creditLimit) * 100)
      : null;
  const estimatedPayoffDate = estimatePayoffDate(debt.startedAt, payoffMonths);

  return {
    monthlyRate,
    estimatedInterest,
    estimatedPrincipal: principalComponent,
    estimatedPayment: roundCurrency(normalizedPayment),
    nextBalance,
    utilization,
    payoffMonths,
    estimatedPayoffDate
  };
}

export function estimateMinimumPayment(
  debt: Pick<DebtLike, "currentAmount" | "minimumPaymentRate" | "type">,
  estimatedInterest = 0
) {
  const baseRate = debt.minimumPaymentRate ?? (debt.type === "CREDIT_CARD" ? 5 : 4);
  const capitalSlice = debt.currentAmount * (baseRate / 100);
  return roundCurrency(
    Math.min(debt.currentAmount + estimatedInterest, capitalSlice + estimatedInterest)
  );
}

export function splitDebtPayment(debt: DebtLike, paymentAmount: number) {
  const projection = calculateDebtProjection(debt);
  const interestAmount = Math.min(paymentAmount, projection.estimatedInterest);
  const principalAmount = Math.min(
    debt.currentAmount,
    Math.max(0, paymentAmount - interestAmount)
  );

  return {
    interestAmount: roundCurrency(interestAmount),
    principalAmount: roundCurrency(principalAmount)
  };
}

export function runDebtSimulation(input: {
  balance: number;
  annualEffectiveRate: number;
  monthlyPayment: number;
  startedAt?: Date | string | null;
}) {
  const monthlyRate = annualEffectiveToMonthlyRate(input.annualEffectiveRate);
  let remaining = Math.max(0, input.balance);
  let months = 0;
  let totalInterest = 0;

  while (remaining > 0 && months < 600) {
    const interest = roundCurrency(remaining * monthlyRate);
    const principal = Math.max(0, roundCurrency(input.monthlyPayment - interest));

    if (principal <= 0) {
      return {
        payoffMonths: null,
        estimatedPayoffDate: null,
        totalInterest: null
      };
    }

    remaining = roundCurrency(Math.max(0, remaining - principal));
    totalInterest = roundCurrency(totalInterest + interest);
    months += 1;
  }

  return {
    payoffMonths: months,
    estimatedPayoffDate: estimatePayoffDate(input.startedAt, months),
    totalInterest
  };
}

function estimatePayoffDate(startedAt: Date | string | null | undefined, payoffMonths: number | null) {
  if (!startedAt || !payoffMonths) {
    return null;
  }

  const date = new Date(startedAt);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Date(date.getFullYear(), date.getMonth() + payoffMonths, date.getDate());
}

function roundCurrency(value: number) {
  return Math.round(value * 100) / 100;
}

function createClampedDate(year: number, month: number, desiredDay: number) {
  const lastDay = new Date(year, month + 1, 0).getDate();
  return new Date(year, month, Math.min(desiredDay, lastDay));
}
