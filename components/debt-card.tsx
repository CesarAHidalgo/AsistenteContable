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

  return (
    <article className="item-card debt-card">
      <header>
        <div>
          <div className="tag-row">
            <span className="chip neutral">{debtTypeLabel(debt.type)}</span>
            {debt.annualEffectiveRate ? (
              <span className="chip neutral">EA {formatPercent(debt.annualEffectiveRate, 2)}</span>
            ) : null}
          </div>
          <h3>{debt.name}</h3>
          <p className="meta">Saldo pendiente: {formatCurrency(debt.currentAmount)}</p>
        </div>
        <span className="chip warning">{Math.round(progress)}%</span>
      </header>

      <div className="progress">
        <span style={{ width: `${Math.min(Math.max(progress, 0), 100)}%` }} />
      </div>

      <div className="detail-grid">
        <div>
          <span className="detail-label">Pagado del credito</span>
          <strong>{formatCurrency(debt.totalPaidAmount)}</strong>
        </div>
        <div>
          <span className="detail-label">Saldo actual</span>
          <strong>{formatCurrency(debt.currentAmount)}</strong>
        </div>
        <div>
          <span className="detail-label">Valor inicial</span>
          <strong>{formatCurrency(debt.initialAmount)}</strong>
        </div>
        <div>
          <span className="detail-label">Capital abonado</span>
          <strong>{formatCurrency(debt.totalPrincipalPaid)}</strong>
        </div>
        <div>
          <span className="detail-label">Cuota estimada</span>
          <strong>{formatCurrency(debt.projection.estimatedPayment)}</strong>
        </div>
        <div>
          <span className="detail-label">Interes prox. mes</span>
          <strong>{formatCurrency(debt.projection.estimatedInterest)}</strong>
        </div>
        <div>
          <span className="detail-label">Capital estimado</span>
          <strong>{formatCurrency(debt.projection.estimatedPrincipal)}</strong>
        </div>
        <div>
          <span className="detail-label">Pago programado</span>
          <strong>{formatCurrency(debt.monthlyPayment ?? debt.projection.estimatedPayment)}</strong>
        </div>
      </div>

      <div className="info-lines">
        {debt.dueDayOfMonth ? <p className="meta">Pago mensual: dia {debt.dueDayOfMonth}</p> : null}
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
        {debt.statementDayOfMonth ? <p className="meta">Corte estimado: dia {debt.statementDayOfMonth}</p> : null}
        {debt.creditLimit ? (
          <p className="meta">
            Cupo usado: {formatCurrency(debt.currentAmount)} de {formatCurrency(debt.creditLimit)}
            {debt.projection.utilization !== null ? ` (${formatPercent(debt.projection.utilization)})` : ""}
          </p>
        ) : null}
        {debt.minimumPaymentAmount ? (
          <p className="meta">Pago minimo configurado: {formatCurrency(debt.minimumPaymentAmount)}</p>
        ) : null}
        {debt.projection.cardCycle ? (
          <>
            <p className="meta">
              Proximo corte: {formatDate(debt.projection.cardCycle.nextStatementDate)}. Proximo pago:{" "}
              {formatDate(debt.projection.cardCycle.nextPaymentDate)}.
            </p>
            <p className="meta">
              Compras hechas el dia de corte:{" "}
              {debt.projection.cardCycle.statementDayPurchasesToNextCycle
                ? "van al siguiente pago"
                : "entran en este mismo corte"}
            </p>
          </>
        ) : null}
        <p className="meta">
          Valor inicial {formatCurrency(debt.initialAmount)} {"->"} saldo actual {formatCurrency(debt.currentAmount)}.
          Has pagado realmente {formatCurrency(debt.totalPaidAmount)} del credito.
          {debt.totalInterestPaid > 0
            ? ` De ese valor, ${formatCurrency(debt.totalInterestPaid)} ha sido interes.`
            : ""}
        </p>
        {debt.projection.payoffMonths ? (
          <p className="meta">
            {debt.projection.installmentPlan ? "Tiempo restante segun plan: " : "Tiempo estimado para salir: "}
            {debt.projection.payoffMonths} mes(es)
            {debt.projection.estimatedPayoffDate
              ? ` · ultima cuota aprox. ${new Intl.DateTimeFormat("es-CO", {
                  year: "numeric",
                  month: "short",
                  day: "numeric"
                }).format(new Date(debt.projection.estimatedPayoffDate))}`
              : ""}
          </p>
        ) : (
          <p className="meta">Con la cuota actual casi todo se iria a interes; conviene revisar el pago.</p>
        )}
        {debt.startedAt ? (
          <p className="meta">
            Inicio del credito: {new Intl.DateTimeFormat("es-CO", {
              year: "numeric",
              month: "short",
              day: "numeric"
            }).format(new Date(debt.startedAt))}
          </p>
        ) : null}
        {lastPayment ? (
          <p className="meta">
            Ultimo pago: {formatCurrency(lastPayment.amount)}. Capital {formatCurrency(lastPayment.principalAmount)} /
            interes {formatCurrency(lastPayment.interestAmount)}
          </p>
        ) : null}
      </div>
    </article>
  );
}
