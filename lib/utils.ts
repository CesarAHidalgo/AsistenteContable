export function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0
  }).format(value);
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-CO", {
    year: "numeric",
    month: "short",
    day: "numeric"
  }).format(new Date(`${value}T00:00:00`));
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
