import { debtTypeLabel, formatCurrency, formatPercent } from "@/lib/utils";

type Debt = {
  id: string;
  name: string;
  type: "FIXED_INSTALLMENT" | "REVOLVING_CREDIT" | "CREDIT_CARD";
  initialAmount: number;
  currentAmount: number;
  annualEffectiveRate: number | null;
  monthlyPayment: number | null;
  creditLimit: number | null;
  minimumPaymentRate: number | null;
  startedAt: string | Date | null;
  totalPaidAmount: number;
  totalPrincipalPaid: number;
  totalInterestPaid: number;
  dueDayOfMonth: number | null;
  statementDayOfMonth: number | null;
  projection: {
    estimatedInterest: number;
    estimatedPrincipal: number;
    estimatedPayment: number;
    utilization: number | null;
    payoffMonths: number | null;
    estimatedPayoffDate: string | Date | null;
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
        {debt.statementDayOfMonth ? <p className="meta">Corte estimado: dia {debt.statementDayOfMonth}</p> : null}
        {debt.creditLimit ? (
          <p className="meta">
            Cupo usado: {formatCurrency(debt.currentAmount)} de {formatCurrency(debt.creditLimit)}
            {debt.projection.utilization !== null ? ` (${formatPercent(debt.projection.utilization)})` : ""}
          </p>
        ) : null}
        {debt.minimumPaymentRate ? (
          <p className="meta">Pago minimo configurado: {formatPercent(debt.minimumPaymentRate, 2)}</p>
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
            Tiempo estimado para salir: {debt.projection.payoffMonths} mes(es)
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
