export function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0
  }).format(value);
}

export function formatDate(value: string | Date) {
  const normalized =
    value instanceof Date ? value : value.includes("T") ? value : `${value}T00:00:00`;

  return new Intl.DateTimeFormat("es-CO", {
    year: "numeric",
    month: "short",
    day: "numeric"
  }).format(new Date(normalized));
}

export function formatDateTime(value: string | Date) {
  const normalized = value instanceof Date ? value : new Date(value);

  return new Intl.DateTimeFormat("es-CO", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(normalized);
}

export function paymentMethodLabel(value: string) {
  const labels: Record<string, string> = {
    BANK_TRANSFER: "Transferencia",
    CREDIT_CARD: "Tarjeta credito",
    DEBIT_CARD: "Tarjeta debito",
    CASH: "Efectivo",
    NEQUI: "Nequi",
    DAVIPLATA: "Daviplata",
    OTHER: "Otro"
  };

  return labels[value] ?? value;
}

export function debtTypeLabel(value: string) {
  const labels: Record<string, string> = {
    FIXED_INSTALLMENT: "Credito fijo",
    REVOLVING_CREDIT: "Rotativo",
    CREDIT_CARD: "Tarjeta"
  };

  return labels[value] ?? value;
}

export function formatPercent(value: number, digits = 1) {
  return new Intl.NumberFormat("es-CO", {
    style: "percent",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits
  }).format(value / 100);
}
