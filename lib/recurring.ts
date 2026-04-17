import { PaymentMethod, TransactionType } from "@prisma/client";

/** Period key "YYYY-MM" en zona local */
export function currentPeriodKey(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function effectiveDayInMonth(year: number, monthIndex: number, dayOfMonth: number): number {
  const dim = new Date(year, monthIndex + 1, 0).getDate();
  return Math.min(Math.max(1, dayOfMonth), dim);
}

/** Hoy ya pasó el día efectivo del mes (para generar una vez en el mes). */
export function shouldGenerateThisMonth(dayOfMonth: number, date = new Date()): boolean {
  const d = effectiveDayInMonth(date.getFullYear(), date.getMonth(), dayOfMonth);
  return date.getDate() >= d;
}

export function transactionAtForMonth(
  year: number,
  monthIndex: number,
  dayOfMonth: number,
  hour = 12
): Date {
  const day = effectiveDayInMonth(year, monthIndex, dayOfMonth);
  return new Date(year, monthIndex, day, hour, 0, 0, 0);
}

export function isNonCardPayment(method: PaymentMethod): boolean {
  return method !== PaymentMethod.CREDIT_CARD;
}

export function assertValidRecurringInput(input: {
  dayOfMonth: number;
  amount: number;
  type: TransactionType;
  paymentMethod: PaymentMethod;
  creditCardDebtId: string | null;
}): string | null {
  if (input.dayOfMonth < 1 || input.dayOfMonth > 28) {
    return "El día del mes debe estar entre 1 y 28.";
  }
  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    return "Indica un importe válido mayor que cero.";
  }
  if (input.paymentMethod === PaymentMethod.CREDIT_CARD && !input.creditCardDebtId) {
    return "Para tarjeta debes elegir una tarjeta registrada.";
  }
  return null;
}
