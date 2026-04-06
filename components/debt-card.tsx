import {
  updateCreditCardPurchaseInstallmentsAction,
  updateDebtPlanningAction
} from "@/app/actions";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { debtTypeLabel, formatCurrency, formatDate, formatPercent } from "@/lib/utils";

type Debt = {
  id: string;
  name: string;
  type: "FIXED_INSTALLMENT" | "REVOLVING_CREDIT" | "CREDIT_CARD";
  initialAmount: number;
  currentAmount: number;
  installmentCount: number | null;
  annualEffectiveRate: number | null;
  monthlyPayment: number | null;
  creditLimit: number | null;
  minimumPaymentAmount: number | null;
  startedAt: string | Date | null;
  totalPaidAmount: number;
  totalPrincipalPaid: number;
  totalInterestPaid: number;
  dueDayOfMonth: number | null;
  statementDayOfMonth: number | null;
  statementDayPurchasesToNextCycle: boolean;
  cardPurchaseSummary: {
    totalPurchased: number;
    previousStatementDate: string | Date | null;
    referenceStatementDate: string | Date | null;
    nextStatementDate: string | Date | null;
    previousPaymentDate: string | Date | null;
    referencePaymentDate: string | Date | null;
    currentStatementTotal: number;
    nextStatementTotal: number;
    currentStatementInstallmentDue: number;
    nextStatementInstallmentDue: number;
    currentCyclePayments: number;
    currentStatementOutstanding: number;
    basePayment: number;
    bankMinimumPayment: number;
    projectedCurrentPayment: number;
    nextProjectedPayment: number;
    latestPurchases: Array<{
      id: string;
      description: string;
      amount: number;
      installmentCount: number;
      installmentAmount: number;
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
    purchases: Array<{
      id: string;
      description: string;
      amount: number;
      installmentCount: number;
      installmentAmount: number;
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
    alerts: Array<{
      tone: "warning" | "neutral";
      message: string;
    }>;
  } | null;
  projection: {
    estimatedInterest: number;
    estimatedPrincipal: number;
    estimatedPayment: number;
    utilization: number | null;
    payoffMonths: number | null;
    estimatedPayoffDate: string | Date | null;
    installmentPlan: {
      firstPaymentDate: string | Date;
      finalPaymentDate: string | Date;
      paidInstallments: number;
      remainingInstallments: number;
      totalInstallments: number;
    } | null;
    cardCycle: {
      nextStatementDate: string | Date;
      nextPaymentDate: string | Date;
      minimumPaymentAmount: number;
      statementDayPurchasesToNextCycle: boolean;
    } | null;
  };
  payments: Array<{
    id: string;
    amount: number;
    principalAmount: number;
    interestAmount: number;
    paidAt: string | Date;
  }>;
};

export function DebtCard({ debt }: { debt: Debt }) {
  const paid = debt.totalPrincipalPaid;
  const progress = debt.initialAmount === 0 ? 0 : (paid / debt.initialAmount) * 100;
  const lastPayment = debt.payments[0];
  const mainPaymentLabel =
    debt.type === "CREDIT_CARD"
      ? "Pago mínimo estimado"
      : debt.type === "REVOLVING_CREDIT"
        ? "Pago mínimo"
        : "Cuota programada";
  const mainPaymentValue =
    debt.type === "CREDIT_CARD"
      ? debt.cardPurchaseSummary?.projectedCurrentPayment ??
        debt.monthlyPayment ??
        debt.minimumPaymentAmount ??
        debt.projection.estimatedPayment
      : debt.type === "REVOLVING_CREDIT"
        ? debt.minimumPaymentAmount ?? debt.projection.estimatedPayment
        : debt.monthlyPayment ?? debt.projection.estimatedPayment;

  return (
    <details className="item-card debt-card debt-card-collapsible">
      <summary className="debt-summary">
        <div className="debt-summary-main">
          <div className="tag-row">
            <span className="chip neutral">{debtTypeLabel(debt.type)}</span>
            {debt.annualEffectiveRate ? (
              <span className="chip neutral">EA {formatPercent(debt.annualEffectiveRate, 2)}</span>
            ) : null}
          </div>
          <h3>{debt.name}</h3>
          <p className="meta">Saldo pendiente: {formatCurrency(debt.currentAmount)}</p>
        </div>

        <div className="debt-summary-side">
          <div className="summary-metric">
            <span className="detail-label">{mainPaymentLabel}</span>
            <strong>{formatCurrency(mainPaymentValue)}</strong>
          </div>
          {debt.cardPurchaseSummary ? (
            <div className="summary-metric">
              <span className="detail-label">Comprado este corte</span>
              <strong>{formatCurrency(debt.cardPurchaseSummary.currentStatementTotal)}</strong>
            </div>
          ) : null}
          <span className="chip warning">{Math.round(progress)}%</span>
        </div>
      </summary>

      <div className="progress">
        <span style={{ width: `${Math.min(Math.max(progress, 0), 100)}%` }} />
      </div>

      <div className="detail-grid debt-key-grid">
        <div>
          <span className="detail-label">Saldo actual</span>
          <strong>{formatCurrency(debt.currentAmount)}</strong>
        </div>
        <div>
          <span className="detail-label">Pagado del crédito</span>
          <strong>{formatCurrency(debt.totalPaidAmount)}</strong>
        </div>
        <div>
          <span className="detail-label">Valor inicial</span>
          <strong>{formatCurrency(debt.initialAmount)}</strong>
        </div>
        <div>
          <span className="detail-label">Capital abonado</span>
          <strong>{formatCurrency(debt.totalPrincipalPaid)}</strong>
        </div>
        {debt.cardPurchaseSummary ? (
          <>
            <div>
              <span className="detail-label">Facturado próximo corte</span>
              <strong>{formatCurrency(debt.cardPurchaseSummary.currentStatementTotal)}</strong>
            </div>
            <div>
              <span className="detail-label">Facturado corte siguiente</span>
              <strong>{formatCurrency(debt.cardPurchaseSummary.nextStatementTotal)}</strong>
            </div>
            <div>
              <span className="detail-label">Pagado a este corte</span>
              <strong>{formatCurrency(debt.cardPurchaseSummary.currentCyclePayments)}</strong>
            </div>
            <div>
              <span className="detail-label">Pendiente del corte</span>
              <strong>{formatCurrency(debt.cardPurchaseSummary.currentStatementOutstanding)}</strong>
            </div>
          </>
        ) : (
          <>
            <div>
              <span className="detail-label">Interés próximo mes</span>
              <strong>{formatCurrency(debt.projection.estimatedInterest)}</strong>
            </div>
            <div>
              <span className="detail-label">Capital estimado</span>
              <strong>{formatCurrency(debt.projection.estimatedPrincipal)}</strong>
            </div>
          </>
        )}
      </div>

      <div className="info-lines">
        {debt.type === "CREDIT_CARD" && debt.cardPurchaseSummary ? (
          <>
            <p className="meta">
              Pago mínimo estimado del corte actual: {formatCurrency(debt.cardPurchaseSummary.projectedCurrentPayment)}
            </p>
            <p className="meta">
              {formatCurrency(debt.cardPurchaseSummary.basePayment)} base +{" "}
              {formatCurrency(debt.cardPurchaseSummary.currentStatementTotal)} del corte ={" "}
              {formatCurrency(debt.cardPurchaseSummary.projectedCurrentPayment)}
            </p>
            {debt.cardPurchaseSummary.alerts.map((alert, index) => (
              <p key={`${alert.message}-${index}`} className={`meta ${alert.tone === "warning" ? "negative-text" : ""}`}>
                {alert.message}
              </p>
            ))}
          </>
        ) : null}
        {debt.monthlyPayment ? (
          <p className="meta">
            {debt.type === "CREDIT_CARD" ? "Pago mínimo base configurado" : "Cuota mensual configurada"}:{" "}
            {formatCurrency(debt.monthlyPayment)}
          </p>
        ) : null}
        {debt.minimumPaymentAmount ? (
          <p className="meta">
            {debt.type === "CREDIT_CARD" ? "Pago mínimo informado por el banco" : "Pago mínimo configurado"}:{" "}
            {formatCurrency(debt.minimumPaymentAmount)}
          </p>
        ) : null}
        {debt.projection.cardCycle ? (
          <p className="meta">
            Próximo corte: {formatDate(debt.projection.cardCycle.nextStatementDate)} · Próximo pago:{" "}
            {formatDate(debt.projection.cardCycle.nextPaymentDate)}
          </p>
        ) : null}
        {debt.creditLimit ? (
          <p className="meta">
            Cupo usado: {formatCurrency(debt.currentAmount)} de {formatCurrency(debt.creditLimit)}
            {debt.projection.utilization !== null ? ` (${formatPercent(debt.projection.utilization)})` : ""}
          </p>
        ) : null}
      </div>

      <details className="inline-editor debt-details-toggle">
        <summary>Ver detalle</summary>
        <div className="info-lines">
          {(debt.type === "CREDIT_CARD" || debt.type === "REVOLVING_CREDIT") ? (
            <form action={updateDebtPlanningAction} className="form-grid compact-form inline-form">
              <input type="hidden" name="redirectTab" value="debts" />
              <input type="hidden" name="debtId" value={debt.id} />
              <label>
                <span>{debt.type === "CREDIT_CARD" ? "Pago minimo base" : "Pago planeado"}</span>
                <input
                  name="monthlyPayment"
                  type="number"
                  min="0"
                  step="0.01"
                  defaultValue={debt.monthlyPayment ?? ""}
                />
              </label>
              <label>
                <span>
                  {debt.type === "CREDIT_CARD"
                    ? "Pago mínimo informado por el banco"
                    : "Pago mínimo configurado"}
                </span>
                <input
                  name="minimumPaymentAmount"
                  type="number"
                  min="0"
                  step="0.01"
                  defaultValue={debt.minimumPaymentAmount ?? ""}
                />
              </label>
              <ConfirmSubmitButton
                idleLabel="Guardar planeación"
                pendingLabel="Guardando..."
                confirmTitle={`Vas a actualizar la planeación de ${debt.name}.`}
                summaryFields={[
                  { name: "monthlyPayment", label: "Pago mensual/base" },
                  { name: "minimumPaymentAmount", label: "Pago mínimo" }
                ]}
              />
            </form>
          ) : null}
          {debt.type === "CREDIT_CARD" && debt.cardPurchaseSummary ? (
            <div className="detail-grid">
              <div>
                <span className="detail-label">Mínimo base</span>
                <strong>{formatCurrency(debt.cardPurchaseSummary.basePayment)}</strong>
              </div>
              <div>
                <span className="detail-label">Mínimo banco</span>
                <strong>{formatCurrency(debt.cardPurchaseSummary.bankMinimumPayment)}</strong>
              </div>
              <div>
                <span className="detail-label">Pago proyectado próximo corte</span>
                <strong>{formatCurrency(debt.cardPurchaseSummary.projectedCurrentPayment)}</strong>
              </div>
              <div>
                <span className="detail-label">Pago proyectado corte siguiente</span>
                <strong>{formatCurrency(debt.cardPurchaseSummary.nextProjectedPayment)}</strong>
              </div>
              <div>
                <span className="detail-label">Periodo abonado</span>
                <strong>
                  {debt.cardPurchaseSummary.previousPaymentDate
                    ? `${formatDate(debt.cardPurchaseSummary.previousPaymentDate)} -> ${formatDate(debt.cardPurchaseSummary.referencePaymentDate ?? debt.cardPurchaseSummary.previousPaymentDate)}`
                    : "Sin ventana"}
                </strong>
              </div>
              <div>
                <span className="detail-label">Facturado pendiente</span>
                <strong>{formatCurrency(debt.cardPurchaseSummary.currentStatementOutstanding)}</strong>
              </div>
            </div>
          ) : null}
          {debt.dueDayOfMonth ? <p className="meta">Pago mensual: día {debt.dueDayOfMonth}</p> : null}
          {debt.statementDayOfMonth ? <p className="meta">Día de corte: {debt.statementDayOfMonth}</p> : null}
          {debt.installmentCount ? <p className="meta">Cuotas pactadas: {debt.installmentCount}</p> : null}
          {debt.projection.installmentPlan ? (
            <>
              <p className="meta">
                Cuotas pagadas a la fecha: {debt.projection.installmentPlan.paidInstallments} de{" "}
                {debt.projection.installmentPlan.totalInstallments}
              </p>
              <p className="meta">
                Cuotas restantes: {debt.projection.installmentPlan.remainingInstallments}
              </p>
            </>
          ) : null}
          {debt.projection.cardCycle ? (
            <p className="meta">
              Compras hechas el día de corte:{" "}
              {debt.projection.cardCycle.statementDayPurchasesToNextCycle
                ? "van al siguiente pago"
                : "entran en este mismo corte"}
            </p>
          ) : null}
          {debt.cardPurchaseSummary?.latestPurchases.length ? (
            <div className="stack-list">
              {debt.cardPurchaseSummary.latestPurchases.map((purchase, index) => (
                <article key={`${purchase.description}-${index}`} className="analysis-list-row">
                  <div>
                    <strong>{purchase.description}</strong>
                    <p className="meta">
                      Corte {purchase.statementDate ? formatDate(purchase.statementDate) : "sin corte"} · pago{" "}
                      {purchase.paymentDueDate ? formatDate(purchase.paymentDueDate) : "sin fecha"}
                    </p>
                  </div>
                  <strong>{formatCurrency(purchase.amount)}</strong>
                </article>
              ))}
            </div>
          ) : null}
          {debt.type === "CREDIT_CARD" && debt.cardPurchaseSummary?.purchases.length ? (
            <details className="inline-editor debt-details-toggle">
              <summary>Gestionar compras de la tarjeta</summary>
              <div className="info-lines">
                <p className="meta">
                  Selecciona una o varias compras y cambia sus cuotas. El mínimo proyectado y los
                  valores de los próximos cortes se recalculan automáticamente.
                </p>
                <form
                  action={updateCreditCardPurchaseInstallmentsAction}
                  className="form-grid compact-form inline-form"
                >
                  <input type="hidden" name="redirectTab" value="cards" />
                  <div className="stack-list">
                    {debt.cardPurchaseSummary.purchases.map((purchase) => (
                      <label key={purchase.id} className="analysis-list-row checkbox-row">
                        <input name="transactionIds" type="checkbox" value={purchase.id} />
                        <div>
                          <strong>{purchase.description}</strong>
                          <p className="meta">
                            Compra {formatCurrency(purchase.amount)} · {purchase.installmentCount} cuota(s) ·{" "}
                            {formatCurrency(purchase.installmentAmount)} por cuota
                          </p>
                          <p className="meta">
                            Primer corte {purchase.statementDate ? formatDate(purchase.statementDate) : "sin corte"} ·
                            primer pago {purchase.paymentDueDate ? formatDate(purchase.paymentDueDate) : "sin fecha"}
                          </p>
                        </div>
                      </label>
                    ))}
                  </div>
                  <label>
                    <span>Nuevas cuotas para las compras seleccionadas</span>
                    <input name="installmentCount" type="number" min="1" step="1" required />
                  </label>
                  <ConfirmSubmitButton
                    idleLabel="Actualizar cuotas"
                    pendingLabel="Actualizando..."
                    confirmTitle="Vas a cambiar las cuotas de varias compras."
                    summaryFields={[{ name: "installmentCount", label: "Nuevas cuotas" }]}
                  />
                </form>
                <div className="stack-list">
                  {debt.cardPurchaseSummary.purchases.map((purchase) => (
                    <details key={`edit-${purchase.id}`} className="inline-editor debt-details-toggle">
                      <summary>Editar {purchase.description}</summary>
                      <div className="info-lines">
                        <p className="meta">
                          Esta compra reparte {formatCurrency(purchase.installmentAmount)} por cuota durante{" "}
                          {purchase.installmentCount} corte(s).
                        </p>
                        <form
                          action={updateCreditCardPurchaseInstallmentsAction}
                          className="form-grid compact-form inline-form"
                        >
                          <input type="hidden" name="redirectTab" value="cards" />
                          <input type="hidden" name="transactionIds" value={purchase.id} />
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
                          <ConfirmSubmitButton
                            idleLabel="Guardar compra"
                            pendingLabel="Guardando..."
                            confirmTitle={`Vas a actualizar las cuotas de ${purchase.description}.`}
                            summaryFields={[{ name: "installmentCount", label: "Número de cuotas" }]}
                          />
                        </form>
                        <div className="stack-list">
                          {purchase.installments.slice(0, 6).map((installment) => (
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
              </div>
            </details>
          ) : null}
          <p className="meta">
            Valor inicial {formatCurrency(debt.initialAmount)} {"->"} saldo actual {formatCurrency(debt.currentAmount)}.
            Has pagado realmente {formatCurrency(debt.totalPaidAmount)} del crédito.
            {debt.totalInterestPaid > 0
              ? ` De ese valor, ${formatCurrency(debt.totalInterestPaid)} ha sido interés.`
              : ""}
          </p>
          {debt.projection.payoffMonths ? (
            <p className="meta">
              {debt.projection.installmentPlan ? "Tiempo restante según plan: " : "Tiempo estimado para salir: "}
              {debt.projection.payoffMonths} mes(es)
              {debt.projection.estimatedPayoffDate
                ? ` · última cuota aprox. ${new Intl.DateTimeFormat("es-CO", {
                    year: "numeric",
                    month: "short",
                    day: "numeric"
                  }).format(new Date(debt.projection.estimatedPayoffDate))}`
                : ""}
            </p>
          ) : (
            <p className="meta">Con la cuota actual casi todo se iría a interés; conviene revisar el pago.</p>
          )}
          {debt.startedAt ? (
            <p className="meta">
              Inicio del crédito: {new Intl.DateTimeFormat("es-CO", {
                year: "numeric",
                month: "short",
                day: "numeric"
              }).format(new Date(debt.startedAt))}
            </p>
          ) : null}
          {lastPayment ? (
            <p className="meta">
              Último pago: {formatCurrency(lastPayment.amount)} el {formatDate(lastPayment.paidAt)}. Capital{" "}
              {formatCurrency(lastPayment.principalAmount)} / interés {formatCurrency(lastPayment.interestAmount)}
            </p>
          ) : null}
        </div>
      </details>
    </details>
  );
}
