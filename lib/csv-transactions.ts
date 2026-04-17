import { PaymentMethod, TransactionType } from "@prisma/client";

export const TRANSACTION_CSV_HEADER =
  "description,amount,type,category,paymentMethod,transactionAt,creditCardDebtName";

export function escapeCsvCell(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n") || value.includes("\r")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const c = line[i];
    if (c === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += c;
    }
  }
  result.push(current);
  return result.map((cell) => cell.trim());
}

const PAYMENT_METHODS = new Set<string>(Object.values(PaymentMethod));
const TRANSACTION_TYPES = new Set<string>(Object.values(TransactionType));

export type ParsedImportRow = {
  description: string;
  amount: number;
  type: TransactionType;
  category: string;
  paymentMethod: PaymentMethod;
  transactionAt: Date;
  creditCardDebtName: string | null;
};

export function parseTransactionImportRow(
  cells: string[],
  lineNumber: number
): { ok: true; row: ParsedImportRow } | { ok: false; error: string } {
  if (cells.length < 6) {
    return { ok: false, error: `Línea ${lineNumber}: faltan columnas (mínimo 6).` };
  }

  const [description, amountRaw, typeRaw, category, paymentRaw, transactionAtRaw, debtNameRaw] = cells;
  const descriptionTrim = description?.trim() ?? "";
  if (!descriptionTrim) {
    return { ok: false, error: `Línea ${lineNumber}: descripción vacía.` };
  }

  const amount = Number(String(amountRaw).replace(",", "."));
  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false, error: `Línea ${lineNumber}: importe inválido.` };
  }

  const type = typeRaw?.trim() as TransactionType;
  if (!TRANSACTION_TYPES.has(type)) {
    return { ok: false, error: `Línea ${lineNumber}: tipo debe ser INCOME o EXPENSE.` };
  }

  const categoryTrim = category?.trim() ?? "";
  if (!categoryTrim) {
    return { ok: false, error: `Línea ${lineNumber}: categoría vacía.` };
  }

  const paymentMethod = paymentRaw?.trim() as PaymentMethod;
  if (!PAYMENT_METHODS.has(paymentMethod)) {
    return { ok: false, error: `Línea ${lineNumber}: medio de pago no reconocido.` };
  }

  const transactionAt = new Date(transactionAtRaw?.trim() ?? "");
  if (Number.isNaN(transactionAt.getTime())) {
    return { ok: false, error: `Línea ${lineNumber}: fecha inválida (usa ISO, ej. 2026-04-12).` };
  }

  const creditCardDebtName = debtNameRaw?.trim() ? debtNameRaw.trim() : null;

  return {
    ok: true,
    row: {
      description: descriptionTrim,
      amount,
      type,
      category: categoryTrim,
      paymentMethod,
      transactionAt,
      creditCardDebtName
    }
  };
}
