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
  firstPaymentAt?: Date | string | null;
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
    debt.firstPaymentAt ?? null,
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
  const nextPaymentDate = getPaymentDateForStatement(nextStatementDate, debt.dueDayOfMonth);

  return {
    nextStatementDate,
    nextPaymentDate,
    minimumPaymentAmount: debt.minimumPaymentAmount ?? 0,
    statementDayPurchasesToNextCycle: debt.statementDayPurchasesToNextCycle ?? true
  };
}

export function getCreditCardPurchaseCycle(
  debt: Pick<
    DebtLike,
    "dueDayOfMonth" | "statementDayOfMonth" | "statementDayPurchasesToNextCycle"
  >,
  purchaseDate: Date,
  selection: "CURRENT_STATEMENT" | "NEXT_STATEMENT" = "CURRENT_STATEMENT"
) {
  if (!debt.statementDayOfMonth || !debt.dueDayOfMonth) {
    return null;
  }

  const baseStatementDate = getStatementDateForPurchase(
    purchaseDate,
    debt.statementDayOfMonth,
    debt.statementDayPurchasesToNextCycle ?? true
  );
  const statementDate =
    selection === "NEXT_STATEMENT"
      ? addMonthsClamped(baseStatementDate, 1, true)
      : baseStatementDate;
  const paymentDueDate = getPaymentDateForStatement(statementDate, debt.dueDayOfMonth);

  return {
    selection,
    statementDate,
    paymentDueDate
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

export function buildDebtPaymentSchedule(input: {
  type: DebtType;
  balance: number;
  annualEffectiveRate: number | null;
  monthlyPayment: number | null;
  minimumPaymentAmount?: number | null;
  startedAt?: Date | string | null;
  firstPaymentAt?: Date | string | null;
  dueDayOfMonth?: number | null;
  installmentCount?: number | null;
  payrollAutopayEnabled?: boolean;
}) {
  if (input.balance <= 0) {
    return {
      rows: [],
      summary: {
        totalInterest: 0,
        totalPrincipal: 0,
        totalPayment: 0,
        payoffMonths: 0
      },
      mode: "empty" as const
    };
  }

  if (input.type === "CREDIT_CARD") {
    return {
      rows: [],
      summary: {
        totalInterest: 0,
        totalPrincipal: 0,
        totalPayment: 0,
        payoffMonths: null
      },
      mode: "unsupported" as const
    };
  }

  const paymentBase =
    input.type === "FIXED_INSTALLMENT"
      ? input.monthlyPayment ?? 0
      : estimateMinimumPayment(
          {
            currentAmount: input.balance,
            minimumPaymentAmount: input.minimumPaymentAmount ?? null,
            type: input.type
          },
          0
        );

  if (paymentBase <= 0) {
    return {
      rows: [],
      summary: {
        totalInterest: 0,
        totalPrincipal: 0,
        totalPayment: 0,
        payoffMonths: null
      },
      mode: "insufficient-payment" as const
    };
  }

  const monthlyRate = annualEffectiveToMonthlyRate(input.annualEffectiveRate);
  const installmentPlan = getInstallmentPlanInfo(
    input.startedAt,
    input.firstPaymentAt ?? null,
    input.dueDayOfMonth ?? null,
    input.installmentCount ?? null
  );
  const payrollCoveredCurrentInstallment =
    Boolean(input.payrollAutopayEnabled) &&
    Boolean(input.dueDayOfMonth) &&
    shouldTreatCurrentMonthInstallmentAsPaid(new Date(), input.dueDayOfMonth ?? null);
  const installmentOffset = payrollCoveredCurrentInstallment ? 1 : 0;
  const firstUpcomingPaymentDate =
    installmentPlan && installmentPlan.remainingInstallments > 0
      ? addMonthsClamped(
          installmentPlan.firstPaymentDate,
          installmentPlan.paidInstallments + installmentOffset,
          true
        )
      : getFirstPaymentDate(
          input.startedAt ? new Date(input.startedAt) : new Date(),
          input.firstPaymentAt ? new Date(input.firstPaymentAt) : null,
          input.dueDayOfMonth ?? null
        );
  const baseInstallmentNumber = (installmentPlan?.paidInstallments ?? 0) + installmentOffset;

  const rows: Array<{
    installmentNumber: number;
    paymentDate: Date;
    openingBalance: number;
    paymentAmount: number;
    interestAmount: number;
    principalAmount: number;
    closingBalance: number;
  }> = [];

  let remaining = roundCurrency(Math.max(0, input.balance));
  let totalInterest = 0;
  let totalPrincipal = 0;
  let totalPayment = 0;
  let monthOffset = 0;
  const maxRows = installmentPlan?.remainingInstallments && installmentPlan.remainingInstallments > 0
    ? Math.min(600, Math.max(installmentPlan.remainingInstallments - installmentOffset, 1))
    : 600;

  while (remaining > 0 && monthOffset < maxRows) {
    const openingBalance = remaining;
    const interestAmount = roundCurrency(openingBalance * monthlyRate);
    const scheduledPayment =
      input.type === "REVOLVING_CREDIT"
        ? estimateMinimumPayment(
            {
              currentAmount: openingBalance,
              minimumPaymentAmount: input.minimumPaymentAmount ?? null,
              type: input.type
            },
            interestAmount
          )
        : paymentBase;
    const normalizedPayment = roundCurrency(Math.min(openingBalance + interestAmount, scheduledPayment));
    const principalAmount = roundCurrency(Math.max(0, normalizedPayment - interestAmount));

    if (principalAmount <= 0) {
      return {
        rows,
        summary: {
          totalInterest: roundCurrency(totalInterest),
          totalPrincipal: roundCurrency(totalPrincipal),
          totalPayment: roundCurrency(totalPayment),
          payoffMonths: null
        },
        mode: "insufficient-payment" as const
      };
    }

    remaining = roundCurrency(Math.max(0, openingBalance - principalAmount));
    totalInterest += interestAmount;
    totalPrincipal += principalAmount;
    totalPayment += normalizedPayment;

    rows.push({
      installmentNumber: baseInstallmentNumber + monthOffset + 1,
      paymentDate: addMonthsClamped(firstUpcomingPaymentDate, monthOffset, true),
      openingBalance,
      paymentAmount: normalizedPayment,
      interestAmount,
      principalAmount,
      closingBalance: remaining
    });

    monthOffset += 1;
  }

  return {
    rows,
    summary: {
      totalInterest: roundCurrency(totalInterest),
      totalPrincipal: roundCurrency(totalPrincipal),
      totalPayment: roundCurrency(totalPayment),
      payoffMonths: rows.length
    },
    mode: "ok" as const
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
  const normalizedReferenceDate = getCalendarDate(referenceDate);
  const candidateThisMonth = createClampedDate(
    normalizedReferenceDate.getFullYear(),
    normalizedReferenceDate.getMonth(),
    day
  );
  const normalizedReferenceCompare = new Date(normalizedReferenceDate);
  normalizedReferenceCompare.setHours(endOfDay ? 23 : 12, endOfDay ? 59 : 0, endOfDay ? 59 : 0, endOfDay ? 999 : 0);
  const candidateCompare = new Date(candidateThisMonth);
  candidateCompare.setHours(endOfDay ? 23 : 12, endOfDay ? 59 : 0, endOfDay ? 59 : 0, endOfDay ? 999 : 0);
  const isPast = normalizedReferenceCompare.getTime() > candidateCompare.getTime();

  const result = isPast
    ? createClampedDate(normalizedReferenceDate.getFullYear(), normalizedReferenceDate.getMonth() + 1, day)
    : createClampedDate(normalizedReferenceDate.getFullYear(), normalizedReferenceDate.getMonth(), day);

  if (endOfDay) {
    result.setHours(23, 59, 59, 999);
  } else {
    result.setHours(12, 0, 0, 0);
  }

  return result;
}

function getStatementDateForPurchase(
  purchaseDate: Date,
  statementDayOfMonth: number,
  statementDayPurchasesToNextCycle: boolean
) {
  const calendarPurchaseDate = getCalendarDate(purchaseDate);
  const statementThisMonth = createClampedDate(
    calendarPurchaseDate.getFullYear(),
    calendarPurchaseDate.getMonth(),
    statementDayOfMonth
  );
  statementThisMonth.setHours(23, 59, 59, 999);

  const purchaseDay = new Date(calendarPurchaseDate);
  purchaseDay.setHours(12, 0, 0, 0);

  const sameDay =
    purchaseDay.getDate() === statementThisMonth.getDate() &&
    purchaseDay.getMonth() === statementThisMonth.getMonth() &&
    purchaseDay.getFullYear() === statementThisMonth.getFullYear();
  const beforeStatement =
    purchaseDay.getFullYear() < statementThisMonth.getFullYear() ||
    (purchaseDay.getFullYear() === statementThisMonth.getFullYear() &&
      purchaseDay.getMonth() < statementThisMonth.getMonth()) ||
    (purchaseDay.getFullYear() === statementThisMonth.getFullYear() &&
      purchaseDay.getMonth() === statementThisMonth.getMonth() &&
      purchaseDay.getDate() < statementThisMonth.getDate());

  if (sameDay) {
    return statementDayPurchasesToNextCycle
      ? addMonthsClamped(statementThisMonth, 1, true)
      : statementThisMonth;
  }

  if (beforeStatement) {
    return statementThisMonth;
  }

  return addMonthsClamped(statementThisMonth, 1, true);
}

function getCalendarDate(date: Date) {
  return new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 12, 0, 0, 0);
}

function getPaymentDateForStatement(statementDate: Date, dueDayOfMonth: number) {
  const sameMonthCandidate = createClampedDate(
    statementDate.getFullYear(),
    statementDate.getMonth(),
    dueDayOfMonth
  );
  sameMonthCandidate.setHours(23, 59, 59, 999);

  if (sameMonthCandidate.getTime() > statementDate.getTime()) {
    return sameMonthCandidate;
  }

  return addMonthsClamped(sameMonthCandidate, 1, true);
}

function getInstallmentPlanInfo(
  startedAt: Date | string | null | undefined,
  firstPaymentAt: Date | string | null | undefined,
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

  const firstPaymentDate = getFirstPaymentDate(startDate, firstPaymentAt ? new Date(firstPaymentAt) : null, dueDayOfMonth);
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

function getFirstPaymentDate(
  startDate: Date,
  explicitFirstPaymentDate: Date | null,
  dueDayOfMonth: number | null
) {
  if (explicitFirstPaymentDate && !Number.isNaN(explicitFirstPaymentDate.getTime())) {
    const date = new Date(explicitFirstPaymentDate);
    date.setHours(23, 59, 59, 999);
    return date;
  }

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

function shouldTreatCurrentMonthInstallmentAsPaid(referenceDate: Date, dueDayOfMonth: number | null) {
  if (!dueDayOfMonth) {
    return false;
  }

  const normalizedReferenceDate = getCalendarDate(referenceDate);
  return normalizedReferenceDate.getDate() < dueDayOfMonth;
}
