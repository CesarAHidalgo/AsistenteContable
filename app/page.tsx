import { DebtCard } from "@/components/debt-card";
import { MetricCard } from "@/components/metric-card";
import { ReminderCard } from "@/components/reminder-card";
import { TransactionCard } from "@/components/transaction-card";
import { seedData } from "@/lib/seed-data";
import { formatCurrency } from "@/lib/utils";

export default function Home() {
  const totalIncome = seedData.transactions
    .filter((item) => item.type === "INCOME")
    .reduce((sum, item) => sum + item.amount, 0);

  const totalExpenses = seedData.transactions
    .filter((item) => item.type === "EXPENSE")
    .reduce((sum, item) => sum + item.amount, 0);

  const totalDebt = seedData.debts.reduce((sum, item) => sum + item.currentAmount, 0);
  const balance = totalIncome - totalExpenses;

  return (
    <main className="page-shell">
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">AsistenteContable</p>
          <h1>Tu contabilidad personal, lista para web, movil y automatizaciones.</h1>
          <p>
            Esta base ya esta preparada para evolucionar a registros reales con PostgreSQL,
            recordatorios mensuales y entradas rapidas desde iPhone o navegadores.
          </p>
        </div>
        <div className="hero-summary">
          <MetricCard label="Balance del mes" value={formatCurrency(balance)} accent="primary" />
          <MetricCard label="Ingresos" value={formatCurrency(totalIncome)} />
          <MetricCard label="Gastos" value={formatCurrency(totalExpenses)} accent="danger" />
          <MetricCard label="Deuda pendiente" value={formatCurrency(totalDebt)} />
        </div>
      </section>

      <section className="grid-layout">
        <article className="panel panel-wide">
          <div className="panel-header">
            <div>
              <p className="section-kicker">Movimientos</p>
              <h2>Transacciones recientes</h2>
            </div>
            <span className="badge">Fase 2</span>
          </div>
          <div className="stack-list">
            {seedData.transactions.map((transaction) => (
              <TransactionCard key={transaction.id} transaction={transaction} />
            ))}
          </div>
        </article>

        <article className="panel">
          <div className="panel-header">
            <div>
              <p className="section-kicker">Pagos</p>
              <h2>Recordatorios</h2>
            </div>
          </div>
          <div className="stack-list">
            {seedData.reminders.map((reminder) => (
              <ReminderCard key={reminder.id} reminder={reminder} />
            ))}
          </div>
        </article>

        <article className="panel">
          <div className="panel-header">
            <div>
              <p className="section-kicker">Deudas</p>
              <h2>Seguimiento de creditos</h2>
            </div>
          </div>
          <div className="stack-list">
            {seedData.debts.map((debt) => (
              <DebtCard key={debt.id} debt={debt} />
            ))}
          </div>
        </article>

        <article className="panel">
          <div className="panel-header">
            <div>
              <p className="section-kicker">Proxima evolucion</p>
              <h2>Backlog inmediato</h2>
            </div>
          </div>
          <ul className="plain-list">
            <li>Autenticacion personal para sincronizar entre dispositivos.</li>
            <li>CRUD real de movimientos, deudas y recordatorios.</li>
            <li>Presupuesto mensual por categoria con alertas mas finas.</li>
            <li>API segura para Atajos de iPhone y automatizaciones.</li>
          </ul>
        </article>
      </section>
    </main>
  );
}
