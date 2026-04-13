/** Clave de mes calendario "YYYY-MM" (zona horaria local). */
export function monthPeriodKey(date: Date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}
