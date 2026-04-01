import { DebtType } from "@prisma/client";

type DebtLike = {
  type: DebtType;
  currentAmount: number;
  installmentCount?: number | null;
  annualEffectiveRate: number | null;
  monthlyPayment: number | null;
  creditLimit: number | null;
  minimumPaymentAmount: number | null;
  dueDayOfMonth?: number | null;
  statementDayOfMonth?: number | null;
  statementDayPurchasesToNextCycle?: boolean;
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

export function getBudgetCycleRangeFromReference(
  referenceDate: Date,
  referenceStart: Date | string,
  referenceEnd: Date | string
) {
  let start = new Date(referenceStart);
  let end = new Date(referenceEnd);

  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) {
    throw new Error("Invalid billing cycle reference dates");
  }

  while (referenceDate < start) {
    start = addMonthsClamped(start, -1, false);
    end = addMonthsClamped(end, -1, true);
  }

  while (referenceDate > end) {
    start = addMonthsClamped(start, 1, false);
    end = addMonthsClamped(end, 1, true);
  }

  return {
    start,
    end,
    endExclusive: new Date(end.getTime() + 1),
    cycleStartDay: start.getDate(),
    cycleEndDay: end.getDate()
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
  const amortizationPayoffMonths = principalComponent > 0 ? Math.ceil(balance / principalComponent) : null;
  const utilization =
    debt.creditLimit && debt.creditLimit > 0
      ? Math.min(999, (balance / debt.creditLimit) * 100)
      : null;
  const installmentPlan = getInstallmentPlanInfo(
    debt.startedAt,
    debt.dueDayOfMonth ?? null,
    debt.installmentCount ?? null
  );
  const payoffMonths = installmentPlan?.remainingInstallments ?? amortizationPayoffMonths;
  const estimatedPayoffDate = installmentPlan?.finalPaymentDate ?? estimatePayoffDate(debt.startedAt, payoffMonths);
  const cardCycle = debt.type === "CREDIT_CARD" ? getCreditCardCycleInfo(debt) : null;

  return {
    monthlyRate,
    estimatedInterest,
    estimatedPrincipal: principalComponent,
    estimatedPayment: roundCurrency(normalizedPayment),
    nextBalance,
    utilization,
    payoffMonths,
    estimatedPayoffDate,
    cardCycle,
    installmentPlan
  };
}

export function estimateMinimumPayment(
  debt: Pick<DebtLike, "currentAmount" | "minimumPaymentAmount" | "type">,
  estimatedInterest = 0
) {
  if (debt.type === "CREDIT_CARD" && debt.minimumPaymentAmount !== null) {
    return roundCurrency(Math.min(debt.currentAmount + estimatedInterest, debt.minimumPaymentAmount));
  }

  if (debt.minimumPaymentAmount !== null) {
    return roundCurrency(Math.min(debt.currentAmount + estimatedInterest, debt.minimumPaymentAmount));
  }

  const fallbackMinimum = debt.currentAmount + estimatedInterest;
  return roundCurrency(fallbackMinimum);
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

export function getCreditCardCycleInfo(
  debt: Pick<
    DebtLike,
    "dueDayOfMonth" | "statementDayOfMonth" | "statementDayPurchasesToNextCycle" | "minimumPaymentAmount" | "currentAmount"
  >,
  referenceDate = new Date()
) {
  if (!debt.statementDayOfMonth || !debt.dueDayOfMonth) {
    return null;
  }

  const nextStatementDate = getNextDayOfMonth(referenceDate, debt.statementDayOfMonth, false);
  const nextPaymentDate = getNextDayOfMonth(referenceDate, debt.dueDayOfMonth, true);

  return {
    nextStatementDate,
    nextPaymentDate,
    minimumPaymentAmount: debt.minimumPaymentAmount ?? 0,
    statementDayPurchasesToNextCycle: debt.statementDayPurchasesToNextCycle ?? true
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

function addMonthsClamped(date: Date, months: number, endOfDay: boolean) {
  const shifted = createClampedDate(date.getFullYear(), date.getMonth() + months, date.getDate());
  if (endOfDay) {
    shifted.setHours(23, 59, 59, 999);
  } else {
    shifted.setHours(0, 0, 0, 0);
  }

  return shifted;
}

function getNextDayOfMonth(referenceDate: Date, day: number, endOfDay: boolean) {
  const candidateThisMonth = createClampedDate(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    day
  );
  const isPast = endOfDay
    ? referenceDate.getTime() > new Date(candidateThisMonth.setHours(23, 59, 59, 999)).getTime()
    : referenceDate.getTime() > new Date(candidateThisMonth.setHours(0, 0, 0, 0)).getTime();

  const result = isPast
    ? createClampedDate(referenceDate.getFullYear(), referenceDate.getMonth() + 1, day)
    : createClampedDate(referenceDate.getFullYear(), referenceDate.getMonth(), day);

  if (endOfDay) {
    result.setHours(23, 59, 59, 999);
  } else {
    result.setHours(0, 0, 0, 0);
  }

  return result;
}

function getInstallmentPlanInfo(
  startedAt: Date | string | null | undefined,
  dueDayOfMonth: number | null,
  installmentCount: number | null,
  referenceDate = new Date()
) {
  if (!startedAt || !installmentCount || installmentCount <= 0) {
    return null;
  }

  const startDate = new Date(startedAt);
  if (Number.isNaN(startDate.getTime())) {
    return null;
  }

  const firstPaymentDate = getFirstPaymentDate(startDate, dueDayOfMonth);
  const finalPaymentDate = addMonthsClamped(firstPaymentDate, installmentCount - 1, true);

  let paidInstallments = 0;
  for (let index = 0; index < installmentCount; index += 1) {
    const paymentDate = addMonthsClamped(firstPaymentDate, index, true);
    if (paymentDate.getTime() <= referenceDate.getTime()) {
      paidInstallments += 1;
    }
  }

  return {
    firstPaymentDate,
    finalPaymentDate,
    paidInstallments,
    remainingInstallments: Math.max(0, installmentCount - paidInstallments),
    totalInstallments: installmentCount
  };
}

function getFirstPaymentDate(startDate: Date, dueDayOfMonth: number | null) {
  if (!dueDayOfMonth) {
    const date = new Date(startDate);
    date.setHours(23, 59, 59, 999);
    return date;
  }

  const candidateThisMonth = createClampedDate(
    startDate.getFullYear(),
    startDate.getMonth(),
    dueDayOfMonth
  );
  const paymentDate =
    candidateThisMonth.getDate() >= startDate.getDate()
      ? candidateThisMonth
      : createClampedDate(startDate.getFullYear(), startDate.getMonth() + 1, dueDayOfMonth);

  paymentDate.setHours(23, 59, 59, 999);
  return paymentDate;
}
