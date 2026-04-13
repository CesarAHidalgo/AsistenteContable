import { closeCreditCardStatementAction, updateCreditCardPurchaseAction } from "@/app/actions";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { formatCurrency, formatDate } from "@/lib/utils";

type CreditCardDebt = {
  id: string;
  name: string;
  currentAmount: number;
  creditLimit: number | null;
  monthlyPayment: number | null;
  minimumPaymentAmount: number | null;
  dueDayOfMonth: number | null;
  statementDayOfMonth: number | null;
  statementDayPurchasesToNextCycle: boolean;
  statementSnapshots: Array<{
    id: string;
    statementDate: string | Date;
    paymentDueDate: string | Date | null;
    basePayment: number | null;
    bankMinimumPayment: number | null;
    statementTotal: number;
    projectedPayment: number;
    paidAmount: number;
    outstandingAmount: number;
    purchaseCount: number;
    closedAt: string | Date;
  }>;
  cardPurchaseSummary: {
    previousStatementDate: string | Date | null;
    referenceStatementDate: string | Date | null;
    nextStatementDate: string | Date | null;
    previousPaymentDate: string | Date | null;
    referencePaymentDate: string | Date | null;
    currentStatementTotal: number;
    nextStatementTotal: number;
    currentCyclePayments: number;
    currentStatementOutstanding: number;
    basePayment: number;
    bankMinimumPayment: number;
    projectedCurrentPayment: number;
    nextProjectedPayment: number;
    alerts: Array<{
      tone: "warning" | "neutral";
      message: string;
    }>;
    purchases: Array<{
      id: string;
      description: string;
      amount: number;
      installmentCount: number;
      installmentAmount: number;
      creditCardCycleSelection: "CURRENT_STATEMENT" | "NEXT_STATEMENT" | null;
      transactionAt: string | Date;
      statementDate: string | Date | null;
      paymentDueDate: string | Date | null;
      installments: Array<{
        sequence: number;
        statementDate: string | Date;
        paymentDueDate: string | Date;
        amount: number;
      }>;
    }>;
  } | null;
};

type CreditCardOption = {
  id: string;
  name: string;
  statementDayOfMonth: number | null;
  dueDayOfMonth: number | null;
};

export function CreditCardStatements({
  debts,
  creditCardOptions
}: {
  debts: CreditCardDebt[];
  creditCardOptions: CreditCardOption[];
}) {
  if (debts.length === 0) {
    return <p className="empty-state">Todavía no has agregado tarjetas de crédito.</p>;
  }

  return (
    <div className="stack-list statement-stack">
      {debts.map((debt) => (
        <article key={debt.id} className="statement-card statement-card-hero">
          <header className="statement-card-header">
            <div>
              <p className="section-kicker">Extracto tarjeta</p>
              <h3>{debt.name}</h3>
              <p className="meta">
                {debt.cardPurchaseSummary?.referenceStatementDate
                  ? `Corte vigente ${formatDate(debt.cardPurchaseSummary.referenceStatementDate)}`
                  : `Corte ${debt.statementDayOfMonth ?? "-"}`}
                {" · "}
                {debt.cardPurchaseSummary?.referencePaymentDate
                  ? `pago ${formatDate(debt.cardPurchaseSummary.referencePaymentDate)}`
                  : `pago ${debt.dueDayOfMonth ?? "-"}`}
                {" · saldo "}
                {formatCurrency(debt.currentAmount)}
              </p>
              {debt.cardPurchaseSummary?.nextStatementDate ? (
                <p className="meta">
                  Próximo corte {formatDate(debt.cardPurchaseSummary.nextStatementDate)}
                </p>
              ) : null}
            </div>
            <div className="statement-metrics">
              <div className="statement-metric">
                <span className="detail-label">Pago mínimo estimado</span>
                <strong>{formatCurrency(debt.cardPurchaseSummary?.projectedCurrentPayment ?? 0)}</strong>
                <small>Base + cuotas activas del corte</small>
              </div>
              <div className="statement-metric">
                <span className="detail-label">Pendiente por cubrir</span>
                <strong>{formatCurrency(debt.cardPurchaseSummary?.currentStatementOutstanding ?? 0)}</strong>
                <small>
                  {debt.cardPurchaseSummary?.currentStatementOutstanding
                    ? "Aún hay presión sobre el corte vigente"
                    : "Tu corte actual va cubierto"}
                </small>
              </div>
            </div>
          </header>

          {debt.cardPurchaseSummary ? (
            <>
              {debt.cardPurchaseSummary.referenceStatementDate ? (
                <form action={closeCreditCardStatementAction} className="inline-form statement-close-form">
                  <input type="hidden" name="redirectTab" value="cards" />
                  <input type="hidden" name="debtId" value={debt.id} />
                  <input
                    type="hidden"
                    name="statementDate"
                    value={new Date(debt.cardPurchaseSummary.referenceStatementDate).toISOString()}
                  />
                  <input
                    type="hidden"
                    name="paymentDueDate"
                    value={
                      debt.cardPurchaseSummary.referencePaymentDate
                        ? new Date(debt.cardPurchaseSummary.referencePaymentDate).toISOString()
                        : ""
                    }
                  />
                  <p className="meta">
                    Cuando cierres el corte, guardamos una foto fija del extracto actual para compararlo después
                    con pagos y cortes futuros.
                  </p>
                  <ConfirmSubmitButton
                    idleLabel="Cerrar corte actual"
                    pendingLabel="Cerrando..."
                    confirmTitle={`Vas a cerrar el corte actual de ${debt.name}.`}
                    confirmDescription="Se guardará una foto fija del extracto para compararlo después."
                  />
                </form>
              ) : null}

              <div className="statement-grid">
                <div className="snapshot-card">
                  <span className="detail-label">Facturado corte actual</span>
                  <strong>{formatCurrency(debt.cardPurchaseSummary.currentStatementTotal)}</strong>
                </div>
                <div className="snapshot-card">
                  <span className="detail-label">Facturado próximo corte</span>
                  <strong>{formatCurrency(debt.cardPurchaseSummary.nextStatementTotal)}</strong>
                </div>
                <div className="snapshot-card">
                  <span className="detail-label">Pagado a este corte</span>
                  <strong>{formatCurrency(debt.cardPurchaseSummary.currentCyclePayments)}</strong>
                </div>
                <div className="snapshot-card">
                  <span className="detail-label">Mínimo próximo corte</span>
                  <strong>{formatCurrency(debt.cardPurchaseSummary.nextProjectedPayment)}</strong>
                </div>
              </div>

              <div className="info-lines">
                <p className="meta">
                  {formatCurrency(debt.cardPurchaseSummary.basePayment)} base +{" "}
                  {formatCurrency(debt.cardPurchaseSummary.currentStatementTotal)} del corte ={" "}
                  {formatCurrency(debt.cardPurchaseSummary.projectedCurrentPayment)}
                </p>
                <p className="meta">
                  Ventana de pago actual:{" "}
                  {debt.cardPurchaseSummary.previousPaymentDate
                    ? formatDate(debt.cardPurchaseSummary.previousPaymentDate)
                    : "-"}{" "}
                  a{" "}
                  {debt.cardPurchaseSummary.referencePaymentDate
                    ? formatDate(debt.cardPurchaseSummary.referencePaymentDate)
                    : "-"}
                </p>
                {debt.cardPurchaseSummary.alerts.map((alert, index) => (
                  <p key={`${alert.message}-${index}`} className={`meta ${alert.tone === "warning" ? "negative-text" : ""}`}>
                    {alert.message}
                  </p>
                ))}
              </div>

              <section className="statement-history-card">
                <div className="panel-header">
                  <div>
                    <h4>Historial de cortes cerrados</h4>
                    <p className="meta">Aquí queda congelado lo que realmente tenía ese extracto al cerrarlo.</p>
                  </div>
                </div>
                {debt.statementSnapshots.length === 0 ? (
                  <p className="empty-state">Todavía no has cerrado cortes para esta tarjeta.</p>
                ) : (
                  <div className="stack-list">
                    {debt.statementSnapshots.map((snapshot) => (
                      <article key={snapshot.id} className="analysis-list-row">
                        <div>
                          <strong>
                            Corte {formatDate(snapshot.statementDate)}
                            {snapshot.paymentDueDate ? ` · pago ${formatDate(snapshot.paymentDueDate)}` : ""}
                          </strong>
                          <p className="meta">
                            {snapshot.purchaseCount} compra(s) · cerrado {formatDate(snapshot.closedAt)}
                          </p>
                          <p className="meta">
                            Facturado {formatCurrency(snapshot.statementTotal)} · pagado{" "}
                            {formatCurrency(snapshot.paidAmount)} · pendiente{" "}
                            {formatCurrency(snapshot.outstandingAmount)}
                          </p>
                        </div>
                        <strong>{formatCurrency(snapshot.projectedPayment)}</strong>
                      </article>
                    ))}
                  </div>
                )}
              </section>

              <div className="stack-list">
                {debt.cardPurchaseSummary.purchases.map((purchase) => (
                  <details key={purchase.id} className="item-card statement-purchase-card">
                    <summary className="statement-purchase-summary">
                      <div>
                        <strong>{purchase.description}</strong>
                        <p className="meta">
                          {formatCurrency(purchase.amount)} · {purchase.installmentCount} cuota(s) ·{" "}
                          {formatCurrency(purchase.installmentAmount)} por cuota
                        </p>
                        <p className="meta">
                          Corte {purchase.statementDate ? formatDate(purchase.statementDate) : "-"} · pago{" "}
                          {purchase.paymentDueDate ? formatDate(purchase.paymentDueDate) : "-"}
                        </p>
                      </div>
                      <span className="chip neutral">{formatDate(purchase.transactionAt)}</span>
                    </summary>

                    <div className="statement-purchase-body">
                      <form action={updateCreditCardPurchaseAction} className="form-grid compact-form inline-form">
                        <input type="hidden" name="redirectTab" value="cards" />
                        <input type="hidden" name="transactionId" value={purchase.id} />
                        <label>
                          <span>Descripción</span>
                          <input name="description" defaultValue={purchase.description} required />
                        </label>
                        <label>
                          <span>Valor</span>
                          <input
                            name="amount"
                            type="number"
                            min="0"
                            step="0.01"
                            defaultValue={purchase.amount}
                            required
                          />
                        </label>
                        <label>
                          <span>Fecha de compra</span>
                          <input
                            name="transactionAt"
                            type="date"
                            defaultValue={new Date(purchase.transactionAt).toISOString().slice(0, 10)}
                            required
                          />
                        </label>
                        <label>
                          <span>Número de cuotas</span>
                          <input
                            name="installmentCount"
                            type="number"
                            min="1"
                            step="1"
                            defaultValue={purchase.installmentCount}
                            required
                          />
                        </label>
                        <label>
                          <span>Tarjeta</span>
                          <select name="creditCardDebtId" defaultValue={debt.id} required>
                            {creditCardOptions.map((option) => (
                              <option key={option.id} value={option.id}>
                                {option.name}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label>
                          <span>Corte</span>
                          <select
                            name="creditCardCycleSelection"
                            defaultValue={purchase.creditCardCycleSelection ?? "CURRENT_STATEMENT"}
                            required
                          >
                            <option value="CURRENT_STATEMENT">
                              Corte actual: {purchase.statementDate ? formatDate(purchase.statementDate) : "-"}
                              {" -> pago "}
                              {purchase.paymentDueDate ? formatDate(purchase.paymentDueDate) : "-"}
                            </option>
                            <option value="NEXT_STATEMENT">
                              Siguiente corte:{" "}
                              {purchase.installments[1]
                                ? formatDate(purchase.installments[1].statementDate)
                                : purchase.statementDate
                                  ? formatDate(
                                      new Date(
                                        new Date(purchase.statementDate).getFullYear(),
                                        new Date(purchase.statementDate).getMonth() + 1,
                                        new Date(purchase.statementDate).getDate()
                                      )
                                    )
                                  : "-"}
                            </option>
                          </select>
                        </label>
                        <PendingSubmitButton idleLabel="Guardar compra" pendingLabel="Guardando..." />
                      </form>

                      <div className="stack-list">
                        {purchase.installments.slice(0, 12).map((installment) => (
                          <article key={`${purchase.id}-${installment.sequence}`} className="analysis-list-row">
                            <div>
                              <strong>Cuota {installment.sequence}</strong>
                              <p className="meta">
                                Corte {formatDate(installment.statementDate)} · pago{" "}
                                {formatDate(installment.paymentDueDate)}
                              </p>
                            </div>
                            <strong>{formatCurrency(installment.amount)}</strong>
                          </article>
                        ))}
                      </div>
                    </div>
                  </details>
                ))}
              </div>
            </>
          ) : (
            <p className="empty-state">Esta tarjeta aún no tiene compras registradas para armar el extracto.</p>
          )}
        </article>
      ))}
    </div>
  );
}
