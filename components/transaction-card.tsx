import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { deleteTransactionAction, updateTransactionAction } from "@/app/actions";
import { formatDateInput, transactionTypeOptions } from "@/lib/serializers";
import { categoryLabel, formatCurrency, formatDate, paymentMethodLabel } from "@/lib/utils";

type Transaction = {
  id: string;
  description: string;
  amount: number;
  type: "INCOME" | "EXPENSE";
  category: string;
  paymentMethod: "BANK_TRANSFER" | "CREDIT_CARD" | "DEBIT_CARD" | "CASH" | "NEQUI" | "DAVIPLATA" | "OTHER";
  installmentCount: number | null;
  creditCardDebtId?: string | null;
  creditCardDebt?: { name: string } | null;
  statementDate?: string | Date | null;
  paymentDueDate?: string | Date | null;
  transactionAt: string | Date;
};

export function TransactionCard({
  transaction,
  redirectTab = "transactions"
}: {
  transaction: Transaction;
  redirectTab?: string;
}) {
  const isCreditCard = transaction.paymentMethod === "CREDIT_CARD";

  return (
    <article className="item-card transaction-card">
      <header>
        <div>
          <h3>{transaction.description}</h3>
          <p className="meta">
            {categoryLabel(transaction.category)} · {paymentMethodLabel(transaction.paymentMethod)} ·{" "}
            {formatDate(transaction.transactionAt)}
            {transaction.installmentCount ? ` · ${transaction.installmentCount} cuota(s)` : ""}
          </p>
          {isCreditCard && transaction.creditCardDebt ? (
            <p className="meta">
              {transaction.creditCardDebt.name}
              {transaction.statementDate ? ` · corte ${formatDate(transaction.statementDate)}` : ""}
              {transaction.paymentDueDate ? ` · pago ${formatDate(transaction.paymentDueDate)}` : ""}
            </p>
          ) : null}
        </div>
        <span className={`chip ${transaction.type === "INCOME" ? "income" : "expense"}`}>
          {formatCurrency(transaction.amount)}
        </span>
      </header>

      <div className="record-actions transaction-actions">
        <details className="inline-editor">
          <summary className="action-summary-button">Editar</summary>
          <form action={updateTransactionAction} className="form-grid compact-form inline-form">
            <input type="hidden" name="redirectTab" value={redirectTab} />
            <input type="hidden" name="transactionId" value={transaction.id} />
            <input type="hidden" name="paymentMethod" value={transaction.paymentMethod} />
            <input type="hidden" name="creditCardDebtName" value={transaction.creditCardDebt?.name ?? ""} />

            <label>
              <span>Descripción</span>
              <input name="description" defaultValue={transaction.description} required />
            </label>

            <label>
              <span>Valor</span>
              <input name="amount" type="number" min="0" step="0.01" defaultValue={transaction.amount} required />
            </label>

            <label>
              <span>Tipo</span>
              <select name="type" defaultValue={transaction.type}>
                {transactionTypeOptions().map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span>Categoría</span>
              <input name="category" defaultValue={transaction.category} required />
            </label>

            <label>
              <span>Fecha</span>
              <input
                name="transactionAt"
                type="date"
                defaultValue={formatDateInput(new Date(transaction.transactionAt))}
                required
              />
            </label>

            {isCreditCard ? (
              <label>
                <span>Número de cuotas</span>
                <input
                  name="installmentCount"
                  type="number"
                  min="1"
                  step="1"
                  defaultValue={transaction.installmentCount ?? ""}
                />
              </label>
            ) : null}

            <ConfirmSubmitButton
              idleLabel="Guardar"
              pendingLabel="Guardando..."
              confirmTitle={`Vas a actualizar el movimiento ${transaction.description}.`}
              summaryFields={[
                { name: "description", label: "Descripción" },
                { name: "amount", label: "Valor" },
                { name: "type", label: "Tipo" },
                { name: "category", label: "Categoría" },
                { name: "transactionAt", label: "Fecha" }
              ]}
            />
          </form>
        </details>

        <form action={deleteTransactionAction}>
          <input type="hidden" name="redirectTab" value={redirectTab} />
          <input type="hidden" name="transactionId" value={transaction.id} />
          <ConfirmSubmitButton
            className="ghost-button destructive-button"
            idleLabel="Eliminar"
            pendingLabel="Eliminando..."
            confirmTitle={`Vas a eliminar el movimiento ${transaction.description}.`}
            confirmDescription="Si pertenece a una tarjeta, también se revertirá su impacto sobre la deuda."
          />
        </form>
      </div>
    </article>
  );
}
