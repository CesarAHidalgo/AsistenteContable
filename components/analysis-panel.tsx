"use client";

import { useState } from "react";
import { categoryLabel, debtTypeLabel, formatCurrency, formatDate, paymentMethodLabel } from "@/lib/utils";

type BreakdownItem = {
  label: string;
  total: number;
  count: number;
  share: number;
};

type AnalysisTransaction = {
  id: string;
  description: string;
  amount: number;
  type: "INCOME" | "EXPENSE";
  category: string;
  paymentMethod: string;
  transactionAt: string | Date;
  creditCardDebtName: string | null;
};

type AnalysisData = {
  expenseByCategory: BreakdownItem[];
  expenseByPaymentMethod: BreakdownItem[];
  topExpenses: Array<{
    id: string;
    description: string;
    amount: number;
    category: string;
    paymentMethod: string;
    transactionAt: string | Date;
  }>;
  monthlyTrend: Array<{
    key: string;
    label: string;
    income: number;
    expense: number;
    balance: number;
  }>;
  transactions: AnalysisTransaction[];
  comparison: {
    currentCycle: {
      income: number;
      expense: number;
      balance: number;
    };
    previousCycle: {
      income: number;
      expense: number;
      balance: number;
    };
  };
  totals: {
    averageExpenseTicket: number;
    averageIncomeTicket: number;
    expenseCategoryCount: number;
    dominantCategory: BreakdownItem | null;
    dominantPaymentMethod: BreakdownItem | null;
  };
};

type AnalysisDebt = {
  id: string;
  name: string;
  type: string;
  currentAmount: number;
};

type AnalysisSummary = {
  totalIncome: number;
  totalExpenses: number;
  totalDebt: number;
  balance: number;
};

type FilterScope = "ALL" | "INCOME" | "EXPENSE";
type FilterPeriod = "ALL" | "CURRENT_MONTH" | "LAST_90_DAYS";

const CHART_COLORS = ["#0f766e", "#c9963f", "#1d4ed8", "#b45309", "#7c3aed", "#be123c"];

export function AnalysisPanel({
  analytics,
  debts,
  summary
}: {
  analytics: AnalysisData;
  debts: AnalysisDebt[];
  summary: AnalysisSummary;
}) {
  const [periodFilter, setPeriodFilter] = useState<FilterPeriod>("CURRENT_MONTH");
  const [typeFilter, setTypeFilter] = useState<FilterScope>("ALL");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [paymentMethodFilter, setPaymentMethodFilter] = useState("ALL");

  const now = new Date();
  const ninetyDaysAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 90, 12, 0, 0, 0);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 12, 0, 0, 0);

  const filteredTransactions = analytics.transactions.filter((transaction) => {
    const transactionDate = new Date(transaction.transactionAt);

    if (periodFilter === "CURRENT_MONTH" && transactionDate < monthStart) {
      return false;
    }

    if (periodFilter === "LAST_90_DAYS" && transactionDate < ninetyDaysAgo) {
      return false;
    }

    if (typeFilter !== "ALL" && transaction.type !== typeFilter) {
      return false;
    }

    if (categoryFilter !== "ALL" && transaction.category !== categoryFilter) {
      return false;
    }

    if (paymentMethodFilter !== "ALL" && transaction.paymentMethod !== paymentMethodFilter) {
      return false;
    }

    return true;
  });

  const expenseTransactions = filteredTransactions.filter((transaction) => transaction.type === "EXPENSE");
  const incomeTransactions = filteredTransactions.filter((transaction) => transaction.type === "INCOME");
  const categoryBreakdown = buildClientBreakdown(
    expenseTransactions,
    (transaction) => categoryLabel(transaction.category)
  );
  const paymentBreakdown = buildClientBreakdown(
    expenseTransactions,
    (transaction) => paymentMethodLabel(transaction.paymentMethod)
  );
  const topExpenses = expenseTransactions
    .slice()
    .sort((left, right) => right.amount - left.amount)
    .slice(0, 5);
  const filteredIncome = incomeTransactions.reduce((sum, item) => sum + item.amount, 0);
  const filteredExpenses = expenseTransactions.reduce((sum, item) => sum + item.amount, 0);
  const filteredBalance = filteredIncome - filteredExpenses;
  const averageExpenseTicket =
    expenseTransactions.length > 0 ? filteredExpenses / expenseTransactions.length : 0;
  const categories = Array.from(new Set(analytics.transactions.map((item) => item.category))).sort((a, b) =>
    a.localeCompare(b, "es-CO")
  );
  const paymentMethods = Array.from(new Set(analytics.transactions.map((item) => item.paymentMethod))).sort(
    (a, b) => a.localeCompare(b, "es-CO")
  );
  const debtBreakdown = debts
    .filter((debt) => debt.currentAmount > 0)
    .slice()
    .sort((left, right) => right.currentAmount - left.currentAmount)
    .slice(0, 5)
    .map((debt) => ({
      label: debt.name,
      total: debt.currentAmount
    }));
  const debtTypeSummary = buildDebtTypeSummary(debts);
  const maxTrendValue = Math.max(
    1,
    ...analytics.monthlyTrend.flatMap((item) => [item.income, item.expense])
  );

  return (
    <div className="stack-list analysis-stack">
      <section className="analysis-card">
        <div className="panel-header">
          <div>
            <h3>Filtros de lectura</h3>
            <p className="meta">Ajusta el análisis por período, tipo, categoría o método de pago.</p>
          </div>
        </div>
        <div className="analysis-filters">
          <label>
            Período
            <select value={periodFilter} onChange={(event) => setPeriodFilter(event.target.value as FilterPeriod)}>
              <option value="CURRENT_MONTH">Mes calendario actual</option>
              <option value="LAST_90_DAYS">Últimos 90 días</option>
              <option value="ALL">Últimos 12 meses cargados</option>
            </select>
          </label>
          <label>
            Tipo
            <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value as FilterScope)}>
              <option value="ALL">Todos</option>
              <option value="EXPENSE">Solo gastos</option>
              <option value="INCOME">Solo ingresos</option>
            </select>
          </label>
          <label>
            Categoría
            <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
              <option value="ALL">Todas</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {categoryLabel(category)}
                </option>
              ))}
            </select>
          </label>
          <label>
            Método de pago
            <select
              value={paymentMethodFilter}
              onChange={(event) => setPaymentMethodFilter(event.target.value)}
            >
              <option value="ALL">Todos</option>
              {paymentMethods.map((method) => (
                <option key={method} value={method}>
                  {paymentMethodLabel(method)}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <div className="detail-grid analysis-kpi-grid analysis-kpi-grid-compact">
        <MetricBlock
          label="Balance filtrado"
          value={formatCurrency(filteredBalance)}
          tone={filteredBalance >= 0 ? "positive" : "negative"}
        />
        <MetricBlock label="Ingresos filtrados" value={formatCurrency(filteredIncome)} />
        <MetricBlock label="Gastos filtrados" value={formatCurrency(filteredExpenses)} />
        <MetricBlock label="Deuda total activa" value={formatCurrency(summary.totalDebt)} />
        <MetricBlock label="Movimientos analizados" value={String(filteredTransactions.length)} />
        <MetricBlock label="Ticket prom. gasto" value={formatCurrency(averageExpenseTicket)} />
        <MetricBlock label="Categoría dominante" value={categoryBreakdown[0]?.label ?? "Sin datos"} />
        <MetricBlock label="Método más usado" value={paymentBreakdown[0]?.label ?? "Sin datos"} />
      </div>

      <div className="analysis-hero-grid">
        <section className="analysis-card analysis-card-hero">
          <div className="panel-header">
            <div>
              <h3>Lectura rápida del ciclo</h3>
              <p className="meta">Flujo actual comparado con el peso de tus deudas.</p>
            </div>
          </div>
          <div className="analysis-flow-grid">
            <FlowMeter
              label="Ingresos vs gastos"
              positiveValue={filteredIncome}
              negativeValue={filteredExpenses}
              positiveLabel="Ingresos"
              negativeLabel="Gastos"
            />
            <FlowMeter
              label="Balance del ciclo vs deuda"
              positiveValue={Math.max(summary.balance, 0)}
              negativeValue={summary.totalDebt}
              positiveLabel="Balance"
              negativeLabel="Deuda"
            />
          </div>
          <div className="analysis-comparison-grid">
            <ComparisonCard
              title="Ciclo actual"
              income={analytics.comparison.currentCycle.income}
              expense={analytics.comparison.currentCycle.expense}
              balance={analytics.comparison.currentCycle.balance}
            />
            <ComparisonCard
              title="Ciclo anterior"
              income={analytics.comparison.previousCycle.income}
              expense={analytics.comparison.previousCycle.expense}
              balance={analytics.comparison.previousCycle.balance}
            />
          </div>
        </section>

        <section className="analysis-card">
          <div className="panel-header">
            <div>
              <h3>Composición de deuda</h3>
              <p className="meta">Qué productos concentran hoy la mayor presión financiera.</p>
            </div>
          </div>
          {debtBreakdown.length === 0 ? (
            <p className="empty-state">No hay deudas activas para graficar.</p>
          ) : (
            <div className="analysis-donut-layout">
              <DonutChart items={debtBreakdown} ariaLabel="Composición de deuda activa" />
              <div className="stack-list compact-list">
                {debtBreakdown.map((item, index) => (
                  <LegendRow
                    key={item.label}
                    color={CHART_COLORS[index % CHART_COLORS.length]}
                    label={item.label}
                    value={formatCurrency(item.total)}
                  />
                ))}
              </div>
            </div>
          )}
          <div className="detail-grid analysis-mini-grid">
            {debtTypeSummary.map((item) => (
              <div key={item.label} className="snapshot-card">
                <span className="detail-label">{item.label}</span>
                <strong>{formatCurrency(item.total)}</strong>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="analysis-grid analysis-grid-featured">
        <section className="analysis-card">
          <div className="panel-header">
            <div>
              <h3>Gasto por categoría</h3>
              <p className="meta">Las categorías que más pesan dentro del filtro actual.</p>
            </div>
          </div>
          {categoryBreakdown.length === 0 ? (
            <p className="empty-state">No hay gastos en el filtro actual.</p>
          ) : (
            <div className="analysis-donut-layout">
              <DonutChart
                items={categoryBreakdown.slice(0, 5).map((item) => ({
                  label: item.label,
                  total: item.total
                }))}
                ariaLabel="Distribución del gasto por categoría"
              />
              <div className="stack-list compact-list">
                {categoryBreakdown.slice(0, 5).map((item, index) => (
                  <LegendRow
                    key={item.label}
                    color={CHART_COLORS[index % CHART_COLORS.length]}
                    label={item.label}
                    value={`${formatCurrency(item.total)} · ${(item.share * 100).toFixed(1)}%`}
                  />
                ))}
              </div>
            </div>
          )}
        </section>

        <section className="analysis-card">
          <div className="panel-header">
            <div>
              <h3>Tendencia de 6 meses</h3>
              <p className="meta">Barras para comparar ingresos y gastos sin ir fila por fila.</p>
            </div>
          </div>
          <div className="trend-bars">
            {analytics.monthlyTrend.map((item) => (
              <article key={item.key} className="trend-bar-card">
                <div className="trend-bar-chart" aria-hidden="true">
                  <span
                    className="trend-bar income"
                    style={{
                      height: `${Math.max((item.income / maxTrendValue) * 100, item.income > 0 ? 12 : 0)}%`
                    }}
                  />
                  <span
                    className="trend-bar expense"
                    style={{
                      height: `${Math.max((item.expense / maxTrendValue) * 100, item.expense > 0 ? 12 : 0)}%`
                    }}
                  />
                </div>
                <strong>{item.label}</strong>
                <p className="meta">
                  {formatCurrency(item.income)} · {formatCurrency(item.expense)}
                </p>
                <span className={item.balance >= 0 ? "positive-text" : "negative-text"}>
                  {formatCurrency(item.balance)}
                </span>
              </article>
            ))}
          </div>
        </section>
      </div>

      <div className="analysis-grid">
        <section className="analysis-card">
          <details className="analysis-details" open>
            <summary className="analysis-details-summary">
              <div>
                <strong>Detalle por categoría</strong>
                <p className="meta">Queda resumido arriba y expandible aquí.</p>
              </div>
              <span className="chip neutral">{categoryBreakdown.length} categoría(s)</span>
            </summary>
            <div className="stack-list details-body">
              {categoryBreakdown.length === 0 ? (
                <p className="empty-state">No hay gastos en el filtro actual.</p>
              ) : (
                categoryBreakdown.map((item) => <BreakdownRow key={item.label} label={item.label} item={item} />)
              )}
            </div>
          </details>
        </section>

        <section className="analysis-card">
          <details className="analysis-details" open>
            <summary className="analysis-details-summary">
              <div>
                <strong>Detalle por método de pago</strong>
                <p className="meta">Sirve para ver dependencia de tarjetas o transferencias.</p>
              </div>
              <span className="chip neutral">{paymentBreakdown.length} método(s)</span>
            </summary>
            <div className="stack-list details-body">
              {paymentBreakdown.length === 0 ? (
                <p className="empty-state">No hay egresos para el filtro actual.</p>
              ) : (
                paymentBreakdown.map((item) => <BreakdownRow key={item.label} label={item.label} item={item} />)
              )}
            </div>
          </details>
        </section>
      </div>

      <section className="analysis-card">
        <details className="analysis-details">
          <summary className="analysis-details-summary">
            <div>
              <strong>Top gastos del filtro</strong>
              <p className="meta">Los movimientos que más movieron tu balance.</p>
            </div>
            <span className="chip neutral">{topExpenses.length} registro(s)</span>
          </summary>
          <div className="stack-list details-body">
            {topExpenses.length === 0 ? (
              <p className="empty-state">No hay gastos registrados con los filtros actuales.</p>
            ) : (
              topExpenses.map((item) => (
                <article key={item.id} className="analysis-list-row">
                  <div>
                    <strong>{item.description}</strong>
                    <p className="meta">
                      {categoryLabel(item.category)} · {paymentMethodLabel(item.paymentMethod)} ·{" "}
                      {formatDate(item.transactionAt)}
                    </p>
                  </div>
                  <strong>{formatCurrency(item.amount)}</strong>
                </article>
              ))
            )}
          </div>
        </details>
      </section>
    </div>
  );
}

function MetricBlock({
  label,
  value,
  tone = "default"
}: {
  label: string;
  value: string;
  tone?: "default" | "positive" | "negative";
}) {
  return (
    <div className={`snapshot-card snapshot-card-tone-${tone}`}>
      <span className="detail-label">{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function ComparisonCard({
  title,
  income,
  expense,
  balance
}: {
  title: string;
  income: number;
  expense: number;
  balance: number;
}) {
  return (
    <article className="comparison-card">
      <strong>{title}</strong>
      <p className="meta">Ingresos {formatCurrency(income)}</p>
      <p className="meta">Gastos {formatCurrency(expense)}</p>
      <p className={balance >= 0 ? "positive-text" : "negative-text"}>{formatCurrency(balance)}</p>
    </article>
  );
}

function FlowMeter({
  label,
  positiveValue,
  negativeValue,
  positiveLabel,
  negativeLabel
}: {
  label: string;
  positiveValue: number;
  negativeValue: number;
  positiveLabel: string;
  negativeLabel: string;
}) {
  const total = Math.max(positiveValue + negativeValue, 1);
  const positiveShare = (positiveValue / total) * 100;

  return (
    <article className="flow-meter">
      <strong>{label}</strong>
      <div className="flow-meter-bar" aria-hidden="true">
        <span
          className="flow-meter-positive"
          style={{ width: `${Math.max(positiveShare, positiveValue > 0 ? 10 : 0)}%` }}
        />
        <span
          className="flow-meter-negative"
          style={{ width: `${Math.max(100 - positiveShare, negativeValue > 0 ? 10 : 0)}%` }}
        />
      </div>
      <div className="flow-meter-meta">
        <span>
          {positiveLabel}: {formatCurrency(positiveValue)}
        </span>
        <span>
          {negativeLabel}: {formatCurrency(negativeValue)}
        </span>
      </div>
    </article>
  );
}

function BreakdownRow({ label, item }: { label: string; item: BreakdownItem }) {
  return (
    <article className="analysis-breakdown-row">
      <div className="analysis-breakdown-head">
        <strong>{label}</strong>
        <span>{formatCurrency(item.total)}</span>
      </div>
      <div className="progress">
        <span style={{ width: `${Math.max(item.share * 100, 2)}%` }} />
      </div>
      <p className="meta">
        {(item.share * 100).toFixed(1)}% del gasto · {item.count} movimiento(s)
      </p>
    </article>
  );
}

function DonutChart({
  items,
  ariaLabel
}: {
  items: Array<{ label: string; total: number }>;
  ariaLabel: string;
}) {
  const total = items.reduce((sum, item) => sum + item.total, 0);
  let currentAngle = -90;
  const segments = items.map((item, index) => {
    const angle = total > 0 ? (item.total / total) * 360 : 0;
    const start = polarToCartesian(50, 50, 42, currentAngle);
    const end = polarToCartesian(50, 50, 42, currentAngle + angle);
    const largeArcFlag = angle > 180 ? 1 : 0;
    const path = `M ${start.x} ${start.y} A 42 42 0 ${largeArcFlag} 1 ${end.x} ${end.y}`;
    currentAngle += angle;

    return {
      path,
      color: CHART_COLORS[index % CHART_COLORS.length],
      label: item.label
    };
  });

  return (
    <div className="donut-chart-shell">
      <svg viewBox="0 0 100 100" role="img" aria-label={ariaLabel} className="donut-chart">
        <circle cx="50" cy="50" r="42" className="donut-track" />
        {segments.map((segment) => (
          <path
            key={segment.label}
            d={segment.path}
            stroke={segment.color}
            strokeWidth="16"
            fill="none"
            strokeLinecap="round"
          />
        ))}
      </svg>
      <div className="donut-chart-center">
        <strong>{formatCurrency(total)}</strong>
        <span>Total</span>
      </div>
    </div>
  );
}

function LegendRow({ color, label, value }: { color: string; label: string; value: string }) {
  return (
    <div className="legend-row">
      <div className="legend-row-copy">
        <span className="legend-dot" style={{ background: color }} aria-hidden="true" />
        <strong>{label}</strong>
      </div>
      <span>{value}</span>
    </div>
  );
}

function buildDebtTypeSummary(debts: AnalysisDebt[]) {
  const buckets = new Map<string, number>();

  for (const debt of debts) {
    if (debt.currentAmount <= 0) {
      continue;
    }

    buckets.set(debt.type, (buckets.get(debt.type) ?? 0) + debt.currentAmount);
  }

  return [...buckets.entries()].map(([type, total]) => ({
    label: debtTypeLabel(type),
    total
  }));
}

function polarToCartesian(centerX: number, centerY: number, radius: number, angleInDegrees: number) {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180;

  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians)
  };
}

function buildClientBreakdown(
  items: AnalysisTransaction[],
  getLabel: (item: AnalysisTransaction) => string
) {
  const total = items.reduce((sum, item) => sum + item.amount, 0);
  const buckets = new Map<string, { label: string; total: number; count: number }>();

  for (const item of items) {
    const label = getLabel(item);
    const current = buckets.get(label) ?? { label, total: 0, count: 0 };
    current.total += item.amount;
    current.count += 1;
    buckets.set(label, current);
  }

  return [...buckets.values()]
    .sort((left, right) => right.total - left.total)
    .map((item) => ({
      ...item,
      share: total > 0 ? item.total / total : 0
    }));
}
