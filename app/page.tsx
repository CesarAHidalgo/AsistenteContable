import Link from "next/link";
import { LogoutButton } from "@/components/auth-client-controls";
import { DebtCard } from "@/components/debt-card";
import {
  DebtForm,
  DebtPaymentForm,
  ReminderForm,
  TransactionForm
} from "@/components/forms";
import { MetricCard } from "@/components/metric-card";
import { ReminderCard } from "@/components/reminder-card";
import { SectionCard } from "@/components/section-card";
import { TransactionCard } from "@/components/transaction-card";
import { requireUser } from "@/lib/auth";
import { getDashboardData } from "@/lib/data";
import { formatCurrency } from "@/lib/utils";

export default async function Home() {
  const user = await requireUser();
  const data = await getDashboardData(user.id);

  return (
    <main className="page-shell">
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">AsistenteContable</p>
          <h1>Tu contabilidad personal, con acceso web seguro y base lista para movil.</h1>
          <p>
            Registra movimientos reales en PostgreSQL, controla tus deudas y crea tokens para integraciones personales.
          </p>
          <div className="hero-actions">
            <Link href="/integraciones" className="inline-link">
              Gestionar integraciones
            </Link>
            <LogoutButton />
          </div>
          <div className="alert-row">
            {data.alerts.highSpend ? (
              <div className="alert-chip warning">Tu gasto del mes ya supera el 85% de tus ingresos.</div>
            ) : null}
            {data.alerts.noIncome ? (
              <div className="alert-chip warning">Tienes gastos registrados sin ingresos este mes.</div>
            ) : null}
            {data.alerts.dueSoonCount > 0 ? (
              <div className="alert-chip success">
                {data.alerts.dueSoonCount} recordatorio(s) vencen en los proximos 5 dias.
              </div>
            ) : null}
          </div>
        </div>

        <div className="hero-summary">
          <MetricCard label="Balance del mes" value={formatCurrency(data.summary.balance)} accent="primary" />
          <MetricCard label="Ingresos" value={formatCurrency(data.summary.totalIncome)} />
          <MetricCard label="Gastos" value={formatCurrency(data.summary.totalExpenses)} accent="danger" />
          <MetricCard label="Deuda pendiente" value={formatCurrency(data.summary.totalDebt)} />
        </div>
      </section>

      <section className="grid-layout">
        <SectionCard kicker="Registro" title="Nuevo movimiento" wide>
          <TransactionForm />
        </SectionCard>

        <SectionCard kicker="Deudas" title="Nueva deuda">
          <DebtForm />
        </SectionCard>

        <SectionCard kicker="Recordatorios" title="Nuevo recordatorio">
          <ReminderForm />
        </SectionCard>

        <SectionCard kicker="Abonos" title="Registrar pago a deuda">
          <DebtPaymentForm debts={data.debts} />
        </SectionCard>

        <SectionCard kicker="Movimientos" title="Transacciones recientes" wide>
          <div className="stack-list">
            {data.transactions.length === 0 ? (
              <p className="empty-state">Todavia no tienes movimientos guardados.</p>
            ) : (
              data.transactions.map((transaction) => (
                <TransactionCard key={transaction.id} transaction={transaction} />
              ))
            )}
          </div>
        </SectionCard>

        <SectionCard kicker="Pagos" title="Recordatorios">
          <div className="stack-list">
            {data.reminders.length === 0 ? (
              <p className="empty-state">No hay recordatorios creados.</p>
            ) : (
              data.reminders.map((reminder) => <ReminderCard key={reminder.id} reminder={reminder} />)
            )}
          </div>
        </SectionCard>

        <SectionCard kicker="Deudas" title="Seguimiento de creditos">
          <div className="stack-list">
            {data.debts.length === 0 ? (
              <p className="empty-state">Todavia no has agregado deudas.</p>
            ) : (
              data.debts.map((debt) => <DebtCard key={debt.id} debt={debt} />)
            )}
          </div>
        </SectionCard>

        <SectionCard kicker="API" title="Integracion movil">
          <ul className="plain-list">
            <li>Sesion segura para uso web.</li>
            <li>Tokens revocables para Atajos de iPhone.</li>
            <li>Endpoints JSON protegidos por `Bearer token`.</li>
            <li>CRUD persistido en PostgreSQL con Prisma.</li>
          </ul>
        </SectionCard>
      </section>
    </main>
  );
}
