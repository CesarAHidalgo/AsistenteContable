import { DebtType, PaymentMethod, TransactionType } from "@prisma/client";

export function decimalToNumber(value: { toNumber(): number } | number | null) {
  if (value === null) {
    return null;
  }

  return typeof value === "number" ? value : value.toNumber();
}

export function formatDateInput(value: Date) {
  return value.toISOString().slice(0, 10);
}

export function paymentMethodOptions(): Array<{ value: PaymentMethod; label: string }> {
  return [
    { value: "BANK_TRANSFER", label: "Transferencia" },
    { value: "CREDIT_CARD", label: "Tarjeta credito" },
    { value: "DEBIT_CARD", label: "Tarjeta debito" },
    { value: "CASH", label: "Efectivo" },
    { value: "NEQUI", label: "Nequi" },
    { value: "DAVIPLATA", label: "Daviplata" },
    { value: "OTHER", label: "Otro" }
  ];
}

export function transactionTypeOptions(): Array<{ value: TransactionType; label: string }> {
  return [
    { value: "INCOME", label: "Ingreso" },
    { value: "EXPENSE", label: "Gasto" }
  ];
}

export function debtTypeOptions(): Array<{ value: DebtType; label: string }> {
  return [
    { value: "FIXED_INSTALLMENT", label: "Credito de tasa fija" },
    { value: "REVOLVING_CREDIT", label: "Credito rotativo" },
    { value: "CREDIT_CARD", label: "Tarjeta de credito" }
  ];
}
