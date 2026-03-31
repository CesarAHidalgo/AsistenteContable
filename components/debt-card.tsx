import { formatCurrency } from "@/lib/utils";

type Debt = {
  id: string;
  name: string;
  initialAmount: number;
  currentAmount: number;
  monthlyPayment: number;
};

export function DebtCard({ debt }: { debt: Debt }) {
  const paid = debt.initialAmount - debt.currentAmount;
  const progress = debt.initialAmount === 0 ? 0 : (paid / debt.initialAmount) * 100;

  return (
    <article className="item-card">
      <header>
        <div>
          <h3>{debt.name}</h3>
          <p className="meta">Saldo pendiente: {formatCurrency(debt.currentAmount)}</p>
          <p className="meta">Pago mensual esperado: {formatCurrency(debt.monthlyPayment)}</p>
        </div>
        <span className="chip warning">{Math.round(progress)}%</span>
      </header>
      <div className="progress">
        <span style={{ width: `${Math.min(progress, 100)}%` }} />
      </div>
    </article>
  );
}
