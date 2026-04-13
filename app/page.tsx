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
  TransactionForm
} from "@/components/forms";
import { MetricCard } from "@/components/metric-card";
import { ReminderCard } from "@/components/reminder-card";
import { SectionCard } from "@/components/section-card";
import { TabNav } from "@/components/tab-nav";
import { CsvTransactionsTools } from "@/components/csv-transactions-tools";
import { TransactionCard } from "@/components/transaction-card";
import { IdleSessionManager } from "@/components/idle-session-manager";
import { requireUser } from "@/lib/auth";
import { getDashboardData } from "@/lib/data";
import { categoryLabel, formatCurrency, formatDate } from "@/lib/utils";

const tabs = [
  { id: "overview", label: "Resumen", href: "/?tab=overview" },
  { id: "transactions", label: "Movimientos", href: "/?tab=transactions" },
  { id: "analysis", label: "Análisis", href: "/?tab=analysis" },
  { id: "debts", label: "Deudas", href: "/?tab=debts" },
  { id: "cards", label: "Tarjetas", href: "/?tab=cards" },
  { id: "simulation", label: "Simulación", href: "/?tab=simulation" },
  { id: "reminders", label: "Recordatorios", href: "/?tab=reminders" }
] as const;

export default async function Home({
  searchParams
}: {
  searchParams?: Promise<{ tab?: string; status?: string; message?: string }>;
}) {
  const user = await requireUser();
  const data = await getDashboardData(user.id);
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const activeTab = tabs.some((tab) => tab.id === resolvedSearchParams.tab)
    ? resolvedSearchParams.tab ?? "overview"
    : "overview";
  const feedbackMessage = resolvedSearchParams.message;
  const feedbackStatus = resolvedSearchParams.status === "warning" || resolvedSearchParams.status === "error"
    ? resolvedSearchParams.status
    : resolvedSearchParams.status === "success"
      ? "success"
      : null;
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
  const transactionsByCategory = Array.from(
    data.transactions.reduce(
      (map, transaction) => {
        const bucket = map.get(transaction.category) ?? [];
        bucket.push(transaction);
        map.set(transaction.category, bucket);
        return map;
      },
      new Map<string, typeof data.transactions>()
    )
  ).sort((left, right) => right[1].length - left[1].length);

  return (
    <main className="page-shell">
      <IdleSessionManager />
      <section className="hero hero-dense">
        <div className="hero-copy">
          <div className="brand-stamp">
            <span className="brand-stamp-mark" aria-hidden="true">
              🧾
            </span>
            <span className="brand-stamp-copy">
              <strong>AsistenteContable</strong>
              <small>Tu dinero, ordenado sin complicarte</small>
            </span>
          </div>
          <p className="eyebrow">Panel principal</p>
          <h1>Ingresos, gastos y tarjetas en un solo lugar</h1>
          <p className="hero-lead">
            Registra movimientos al momento, revisa deudas y cortes con textos claros y sin hojas de cálculo.
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
          <MetricCard
            label="Balance del mes"
            value={formatCurrency(data.summary.balance)}
            accent="primary"
            icon="📊"
            helper={data.summary.balance >= 0 ? "Mes bajo control" : "Mes apretado"}
          />
          <MetricCard label="Ingresos" value={formatCurrency(data.summary.totalIncome)} icon="💰" helper="Entradas del ciclo" />
          <MetricCard
            label="Gastos"
            value={formatCurrency(data.summary.totalExpenses)}
            accent="danger"
            icon="💸"
            helper="Salidas del ciclo"
          />
          <MetricCard label="Deuda pendiente" value={formatCurrency(data.summary.totalDebt)} accent="neutral" icon="🏦" helper="Saldo vivo total" />
        </div>
      </section>

      <TabNav tabs={[...tabs]} activeTab={activeTab} />

      {feedbackMessage && feedbackStatus ? (
        <section className={`feedback-banner ${feedbackStatus}`}>
          <strong>
            {feedbackStatus === "success"
              ? "✅ Acción completada"
              : feedbackStatus === "warning"
                ? "⚠️ Revisa esta acción"
                : "❌ No se pudo completar"}
          </strong>
          <p>{feedbackMessage}</p>
        </section>
      ) : null}

      {activeTab === "overview" ? (
        <section className="grid-layout dashboard-grid">
          <SectionCard kicker="Panorama" title="Pulso del mes" icon="🧭" subtitle="Una lectura rápida para saber cómo va el ciclo." className="panel-stretch panel-brand">
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
              redirectTab="overview"
              billingCycleReferenceStart={data.summary.cycleReferenceStart}
              billingCycleReferenceEnd={data.summary.cycleReferenceEnd}
            />
          </SectionCard>

          <SectionCard kicker="Movimientos" title="Últimos registros" icon="🕘" subtitle="Tus registros más recientes, listos para revisar o corregir." className="panel-stretch">
            <div className="stack-list">
              {data.transactions.length === 0 ? (
                <p className="empty-state">Aún no tienes movimientos guardados.</p>
              ) : (
                data.transactions.slice(0, 3).map((transaction) => (
                  <TransactionCard key={transaction.id} transaction={transaction} redirectTab="overview" />
                ))
              )}
            </div>
          </SectionCard>

          <SectionCard kicker="Deudas" title="Prioridades financieras" icon="🎯" subtitle="Ordenadas con estrategia bola de nieve: primero las salidas más rápidas." wide className="panel-highlight">
            <div className="stack-list two-column-list">
              {snowballDebts.length === 0 ? (
                <p className="empty-state">Aún no tienes créditos o tarjetas registradas.</p>
              ) : (
                snowballDebts.slice(0, 4).map((debt) => <DebtCard key={debt.id} debt={debt} />)
              )}
            </div>
          </SectionCard>

        </section>
      ) : null}

      {activeTab === "transactions" ? (
        <section className="grid-layout dashboard-grid single-column">
          <SectionCard kicker="Registro" title="Nuevo movimiento" icon="✍️" subtitle="Captura un gasto o ingreso sin salir del flujo." wide className="panel-brand">
            <TransactionForm
              redirectTab="transactions"
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

          <SectionCard kicker="Movimientos" title="Historial por categoría" icon="🗂️" subtitle="Explora tus movimientos agrupados para leerlos de un vistazo." wide>
            <div className="stack-list">
              {data.transactions.length === 0 ? (
                <p className="empty-state">Todavía no tienes movimientos guardados.</p>
              ) : (
                transactionsByCategory.map(([category, transactions]) => (
                  <details key={category} className="item-card category-group">
                    <summary className="category-group-summary">
                      <div>
                        <strong>{categoryLabel(category)}</strong>
                        <p className="meta">{transactions.length} movimiento(s)</p>
                      </div>
                      <span className="chip neutral">
                        {formatCurrency(
                          transactions.reduce((sum, transaction) => sum + transaction.amount, 0)
                        )}
                      </span>
                    </summary>
                    <div className="statement-purchase-body">
                      <div className="stack-list">
                        {transactions.map((transaction) => (
                          <TransactionCard
                            key={transaction.id}
                            transaction={transaction}
                            redirectTab="transactions"
                          />
                        ))}
                      </div>
                    </div>
                  </details>
                ))
              )}
            </div>
          </SectionCard>

          <SectionCard
            kicker="Datos"
            title="Exportar e importar movimientos (CSV)"
            subtitle="Mismo formato de columnas para respaldo o cargas masivas desde hoja de cálculo."
            wide
          >
            <CsvTransactionsTools />
          </SectionCard>
        </section>
      ) : null}

      {activeTab === "analysis" ? (
        <section className="grid-layout dashboard-grid">
          <SectionCard kicker="Análisis" title="Radiografía del ciclo actual" icon="📈" subtitle="Distribución, tendencias y señales para tomar decisiones." wide className="panel-highlight">
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
          <SectionCard kicker="Deudas" title="Nuevo crédito o tarjeta" icon="🏦" subtitle="Registra la base financiera de cada producto." className="panel-brand">
            <DebtForm redirectTab="debts" />
          </SectionCard>

          <SectionCard kicker="Pagos" title="Registrar pago" icon="💵" subtitle="Aplica pagos con trazabilidad sobre saldo y capital.">
            <DebtPaymentForm debts={data.debts} redirectTab="debts" />
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

          <SectionCard kicker="Seguimiento" title="Deudas activas" icon="🧱" subtitle="Cada deuda con su propio estado, presión y progreso." wide className="panel-highlight">
            <div className="stack-list two-column-list">
              {data.debts.length === 0 ? (
                <p className="empty-state">Todavía no has agregado deudas.</p>
              ) : (
                data.debts.map((debt) => <DebtCard key={debt.id} debt={debt} />)
              )}
            </div>
          </SectionCard>

          <SectionCard kicker="Administración" title="Editar o eliminar deudas y pagos" icon="🛠️" subtitle="Ajustes finos y mantenimiento de tus registros financieros." wide>
            <DebtManagementPanel debts={data.debts} redirectTab="debts" />
          </SectionCard>
        </section>
      ) : null}

      {activeTab === "cards" ? (
        <section className="grid-layout dashboard-grid single-column">
          <SectionCard kicker="Tarjetas" title="Extractos y compras por tarjeta" icon="💳" subtitle="Una vista más cercana al extracto real de cada tarjeta." wide className="panel-highlight">
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
          <SectionCard kicker="Simulación" title="Comparar cuota actual vs cuota aumentada" icon="🧮" subtitle="Evalúa cuánto ganas si subes la cuota o cambias la estrategia." wide className="panel-brand">
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
          <SectionCard kicker="Recordatorios" title="Nuevo recordatorio" icon="⏰" subtitle="Programa pagos o alarmas puntuales sin perder seguimiento.">
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

          <SectionCard kicker="Agenda" title="Todos los recordatorios" icon="🗓️" subtitle="Tu lista viva de pendientes y vencimientos." wide>
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
