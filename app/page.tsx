import Link from "next/link";
import { AnalysisPanel } from "@/components/analysis-panel";
import { LogoutButton } from "@/components/auth-client-controls";
import { CreditCardStatements } from "@/components/credit-card-statements";
import { DebtCard } from "@/components/debt-card";
import { DebtSimulator } from "@/components/debt-simulator";
import {
  BillingCycleForm,
  DebtForm,
  DebtPaymentForm,
  DebtManagementPanel,
  ReminderForm,
  TransactionForm,
  TransactionManagementPanel
} from "@/components/forms";
import { MetricCard } from "@/components/metric-card";
import { ReminderCard } from "@/components/reminder-card";
import { SectionCard } from "@/components/section-card";
import { TabNav } from "@/components/tab-nav";
import { TransactionCard } from "@/components/transaction-card";
import { IdleSessionManager } from "@/components/idle-session-manager";
import { requireUser } from "@/lib/auth";
import { getDashboardData } from "@/lib/data";
import { formatCurrency, formatDate } from "@/lib/utils";

const tabs = [
  { id: "overview", label: "Resumen", href: "/?tab=overview" },
  { id: "transactions", label: "Movimientos", href: "/?tab=transactions" },
  { id: "analysis", label: "Análisis", href: "/?tab=analysis" },
  { id: "debts", label: "Deudas y tarjetas", href: "/?tab=debts" },
  { id: "cards", label: "Extractos TC", href: "/?tab=cards" },
  { id: "simulation", label: "Simulación", href: "/?tab=simulation" },
  { id: "reminders", label: "Recordatorios", href: "/?tab=reminders" }
] as const;

export default async function Home({
  searchParams
}: {
  searchParams?: Promise<{ tab?: string }>;
}) {
  const user = await requireUser();
  const data = await getDashboardData(user.id);
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const activeTab = tabs.some((tab) => tab.id === resolvedSearchParams.tab)
    ? resolvedSearchParams.tab ?? "overview"
    : "overview";
  const snowballDebts = data.debts
    .filter((debt) => debt.currentAmount > 0)
    .slice()
    .sort((left, right) => {
      if (left.currentAmount !== right.currentAmount) {
        return left.currentAmount - right.currentAmount;
      }

      const leftPayoffMonths = left.projection.payoffMonths ?? Number.MAX_SAFE_INTEGER;
      const rightPayoffMonths = right.projection.payoffMonths ?? Number.MAX_SAFE_INTEGER;
      return leftPayoffMonths - rightPayoffMonths;
    });

  return (
    <main className="page-shell">
      <IdleSessionManager />
      <section className="hero hero-dense">
        <div className="hero-copy">
          <p className="eyebrow">AsistenteContable</p>
          <h1>Controla ingresos, gastos, cuotas y tarjetas sin perderte en una sola pantalla.</h1>
          <p>
            Todo se guarda en PostgreSQL y ahora el seguimiento de deudas estima interés, capital y pago
            sugerido según el tipo de producto.
          </p>
          <div className="hero-actions">
            <Link href="/integraciones" className="inline-link">
              Integraciones
            </Link>
            <LogoutButton />
          </div>
          <div className="alert-row">
            <div className="alert-chip success">
              Ciclo actual: {formatDate(data.summary.cycleStartLabel)} a {formatDate(data.summary.cycleEndLabel)}
            </div>
            {data.alerts.highSpend ? (
              <div className="alert-chip warning">Tus gastos del mes ya van altos frente a tus ingresos.</div>
            ) : null}
            {data.alerts.noIncome ? (
              <div className="alert-chip warning">Este mes tienes gastos sin ingresos registrados.</div>
            ) : null}
            {data.alerts.dueSoonCount > 0 ? (
              <div className="alert-chip success">
                {data.alerts.dueSoonCount} recordatorio(s) vencen en los próximos 5 días.
              </div>
            ) : null}
          </div>
        </div>

        <div className="hero-summary hero-summary-grid">
          <MetricCard label="Balance del mes" value={formatCurrency(data.summary.balance)} accent="primary" />
          <MetricCard label="Ingresos" value={formatCurrency(data.summary.totalIncome)} />
          <MetricCard label="Gastos" value={formatCurrency(data.summary.totalExpenses)} accent="danger" />
          <MetricCard label="Deuda pendiente" value={formatCurrency(data.summary.totalDebt)} />
        </div>
      </section>

      <TabNav tabs={[...tabs]} activeTab={activeTab} />

      {activeTab === "overview" ? (
        <section className="grid-layout dashboard-grid">
          <SectionCard kicker="Panorama" title="Pulso del mes">
            <div className="stack-list">
              <div className="snapshot-card">
                <span className="detail-label">Movimientos cargados este mes</span>
                <strong>{data.summary.monthlyTransactionCount}</strong>
              </div>
              <div className="snapshot-card">
                <span className="detail-label">Deudas activas</span>
                <strong>{data.summary.activeDebtCount}</strong>
              </div>
              <div className="snapshot-card">
                <span className="detail-label">Recordatorios pendientes</span>
                <strong>{data.summary.pendingReminderCount}</strong>
              </div>
            </div>
            <BillingCycleForm
              billingCycleReferenceStart={data.summary.cycleReferenceStart}
              billingCycleReferenceEnd={data.summary.cycleReferenceEnd}
            />
          </SectionCard>

          <SectionCard kicker="Movimientos" title="Ultimos registros">
            <div className="stack-list">
              {data.transactions.length === 0 ? (
                <p className="empty-state">Aún no tienes movimientos guardados.</p>
              ) : (
                data.transactions.slice(0, 5).map((transaction) => (
                  <TransactionCard key={transaction.id} transaction={transaction} />
                ))
              )}
            </div>
          </SectionCard>

          <SectionCard kicker="Deudas" title="Prioridades financieras" wide>
            <div className="stack-list two-column-list">
              {snowballDebts.length === 0 ? (
                <p className="empty-state">Aún no tienes créditos o tarjetas registradas.</p>
              ) : (
                snowballDebts.slice(0, 4).map((debt) => <DebtCard key={debt.id} debt={debt} />)
              )}
            </div>
          </SectionCard>

          <SectionCard kicker="Agenda" title="Proximos pagos">
            <div className="stack-list">
              {data.reminders.length === 0 ? (
                <p className="empty-state">No hay recordatorios creados.</p>
              ) : (
                data.reminders.slice(0, 5).map((reminder) => <ReminderCard key={reminder.id} reminder={reminder} />)
              )}
            </div>
          </SectionCard>
        </section>
      ) : null}

      {activeTab === "transactions" ? (
        <section className="grid-layout dashboard-grid">
          <SectionCard kicker="Registro" title="Nuevo movimiento">
            <TransactionForm
              creditCardDebts={data.debts
                .filter((debt) => debt.type === "CREDIT_CARD")
                .map((debt) => ({
                  id: debt.id,
                  name: debt.name,
                  statementDayOfMonth: debt.statementDayOfMonth,
                  dueDayOfMonth: debt.dueDayOfMonth,
                  statementDayPurchasesToNextCycle: debt.statementDayPurchasesToNextCycle
                }))}
            />
          </SectionCard>

          <SectionCard kicker="Movimientos" title="Historial reciente" wide>
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

          <SectionCard kicker="Administracion" title="Editar o eliminar movimientos" wide>
            <TransactionManagementPanel transactions={data.transactions} />
          </SectionCard>
        </section>
      ) : null}

      {activeTab === "analysis" ? (
        <section className="grid-layout dashboard-grid">
          <SectionCard kicker="Análisis" title="Radiografía del ciclo actual" wide>
            <AnalysisPanel analytics={data.analytics} />
          </SectionCard>

          <SectionCard kicker="Lectura" title="Cómo usar este módulo">
            <ul className="plain-list">
              <li>Categoría dominante te muestra en qué se está concentrando tu gasto del ciclo.</li>
              <li>Método de pago dominante ayuda a detectar cuando dependes demasiado de una tarjeta o canal.</li>
              <li>El top de gastos te deja ubicar rápido los egresos que más te movieron el balance.</li>
              <li>La tendencia de 6 meses sirve para ver si el gasto viene subiendo o bajando en el tiempo.</li>
            </ul>
          </SectionCard>
        </section>
      ) : null}

      {activeTab === "debts" ? (
        <section className="grid-layout dashboard-grid">
          <SectionCard kicker="Deudas" title="Nuevo crédito o tarjeta">
            <DebtForm />
          </SectionCard>

          <SectionCard kicker="Pagos" title="Registrar pago">
            <DebtPaymentForm debts={data.debts} />
          </SectionCard>

          <SectionCard kicker="Lectura" title="Cómo leer el estimado" wide>
            <ul className="plain-list">
              <li>La cuota estimada usa tu tasa EA para aproximar interés mensual.</li>
              <li>En crédito fijo compara la cuota que configuraste contra el interés estimado.</li>
              <li>En rotativos y tarjetas se muestra el valor mínimo configurado o el pago estimado según el caso.</li>
              <li>El capital del pago reduce la deuda; el interés te ayuda a ver si vale subir la cuota.</li>
              <li>La fecha estimada de última cuota toma como base la fecha de inicio del crédito.</li>
            </ul>
          </SectionCard>

          <SectionCard kicker="Seguimiento" title="Deudas activas" wide>
            <div className="stack-list two-column-list">
              {data.debts.length === 0 ? (
                <p className="empty-state">Todavía no has agregado deudas.</p>
              ) : (
                data.debts.map((debt) => <DebtCard key={debt.id} debt={debt} />)
              )}
            </div>
          </SectionCard>

          <SectionCard kicker="Administración" title="Editar o eliminar deudas y pagos" wide>
            <DebtManagementPanel debts={data.debts} />
          </SectionCard>
        </section>
      ) : null}

      {activeTab === "cards" ? (
        <section className="grid-layout dashboard-grid single-column">
          <SectionCard kicker="Tarjetas" title="Extractos y compras por tarjeta" wide>
            <CreditCardStatements
              debts={data.debts.filter((debt) => debt.type === "CREDIT_CARD")}
              creditCardOptions={data.debts
                .filter((debt) => debt.type === "CREDIT_CARD")
                .map((debt) => ({
                  id: debt.id,
                  name: debt.name,
                  statementDayOfMonth: debt.statementDayOfMonth,
                  dueDayOfMonth: debt.dueDayOfMonth
                }))}
            />
          </SectionCard>
        </section>
      ) : null}

      {activeTab === "simulation" ? (
        <section className="grid-layout dashboard-grid">
          <SectionCard kicker="Simulación" title="Comparar cuota actual vs cuota aumentada" wide>
            <DebtSimulator />
          </SectionCard>

          <SectionCard kicker="Lectura" title="Cómo interpretar la proyección">
            <ul className="plain-list">
              <li>La primera columna representa la deuda con tu cuota actual.</li>
              <li>La segunda muestra el efecto de subir la cuota mensual.</li>
              <li>La fecha estimada de salida es una proyección basada en la fecha de inicio.</li>
              <li>Si la cuota no alcanza para cubrir el interés del mes, el simulador te lo avisa.</li>
            </ul>
          </SectionCard>

          <SectionCard kicker="Uso" title="Para que sirve">
            <p className="empty-state">
              Esta pestaña te ayuda a decidir si conviene acelerar pagos, refinanciar o evitar más gasto en una
              tarjeta o crédito.
            </p>
          </SectionCard>
        </section>
      ) : null}

      {activeTab === "reminders" ? (
        <section className="grid-layout dashboard-grid">
          <SectionCard kicker="Recordatorios" title="Nuevo recordatorio">
            <ReminderForm />
          </SectionCard>

          <SectionCard kicker="Notificaciones" title="Cómo funcionan">
            <ul className="plain-list">
              <li>Los recordatorios de pago pueden avisar desde varios días antes y paran al marcar el pago como realizado.</li>
              <li>Las alarmas usan la fecha y hora exactas que configures para disparar la notificación.</li>
              <li>Desde cada tarjeta puedes completar, editar o eliminar el recordatorio.</li>
              <li>El envío automático se ejecuta desde un endpoint interno pensado para cron y soporta correo hoy, con push y WhatsApp listos para habilitar.</li>
            </ul>
          </SectionCard>

          <SectionCard kicker="Agenda" title="Todos los recordatorios" wide>
            <div className="stack-list">
              {data.reminders.length === 0 ? (
                <p className="empty-state">No hay recordatorios creados.</p>
              ) : (
                data.reminders.map((reminder) => <ReminderCard key={reminder.id} reminder={reminder} />)
              )}
            </div>
          </SectionCard>
        </section>
      ) : null}
    </main>
  );
}
