import { formatCurrency, formatDate, paymentMethodLabel } from "@/lib/utils";

type Transaction = {
  id: string;
  description: string;
  amount: number;
  type: "INCOME" | "EXPENSE";
  category: string;
  paymentMethod: "BANK_TRANSFER" | "CREDIT_CARD" | "DEBIT_CARD" | "CASH" | "NEQUI" | "DAVIPLATA" | "OTHER";
  installmentCount: number | null;
  transactionAt: string | Date;
};

export function TransactionCard({ transaction }: { transaction: Transaction }) {
  return (
    <article className="item-card">
      <header>
        <div>
          <h3>{transaction.description}</h3>
          <p className="meta">
            {transaction.category} · {paymentMethodLabel(transaction.paymentMethod)} ·{" "}
            {formatDate(transaction.transactionAt)}
            {transaction.paymentMethod === "CREDIT_CARD" && transaction.installmentCount
              ? ` · ${transaction.installmentCount} cuota(s)`
              : ""}
          </p>
        </div>
        <span className={`chip ${transaction.type === "INCOME" ? "income" : "expense"}`}>
          {formatCurrency(transaction.amount)}
        </span>
      </header>
    </article>
  );
}
