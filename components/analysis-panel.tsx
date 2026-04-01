"use client";

import { useState } from "react";
import { formatCurrency, formatDate, paymentMethodLabel } from "@/lib/utils";

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

type FilterScope = "ALL" | "INCOME" | "EXPENSE";
type FilterPeriod = "ALL" | "CURRENT_MONTH" | "LAST_90_DAYS";

export function AnalysisPanel({ analytics }: { analytics: AnalysisData }) {
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
  const categoryBreakdown = buildClientBreakdown(expenseTransactions, (transaction) => transaction.category);
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
  const averageIncomeTicket = incomeTransactions.length > 0 ? filteredIncome / incomeTransactions.length : 0;
  const categories = Array.from(new Set(analytics.transactions.map((item) => item.category))).sort((a, b) =>
    a.localeCompare(b, "es-CO")
  );
  const paymentMethods = Array.from(new Set(analytics.transactions.map((item) => item.paymentMethod))).sort((a, b) =>
    a.localeCompare(b, "es-CO")
  );

  return (
    <div className="stack-list analysis-stack">
      <section className="analysis-card">
        <div className="panel-header">
          <div>
            <h3>Filtros de lectura</h3>
            <p className="meta">Ajusta el analisis por periodo, tipo, categoria o metodo de pago.</p>
          </div>
        </div>
        <div className="analysis-filters">
          <label>
            Periodo
            <select value={periodFilter} onChange={(event) => setPeriodFilter(event.target.value as FilterPeriod)}>
              <option value="CURRENT_MONTH">Mes calendario actual</option>
              <option value="LAST_90_DAYS">Ultimos 90 dias</option>
              <option value="ALL">Todo el historico cargado</option>
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
            Categoria
            <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
              <option value="ALL">Todas</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </label>
          <label>
            Metodo de pago
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

      <div className="detail-grid analysis-kpi-grid">
        <div>
          <span className="detail-label">Balance filtrado</span>
          <strong className={filteredBalance >= 0 ? "positive-text" : "negative-text"}>
            {formatCurrency(filteredBalance)}
          </strong>
        </div>
        <div>
          <span className="detail-label">Ingresos filtrados</span>
          <strong>{formatCurrency(filteredIncome)}</strong>
        </div>
        <div>
          <span className="detail-label">Gastos filtrados</span>
          <strong>{formatCurrency(filteredExpenses)}</strong>
        </div>
        <div>
          <span className="detail-label">Movimientos en analisis</span>
          <strong>{filteredTransactions.length}</strong>
        </div>
        <div>
          <span className="detail-label">Ticket promedio de gasto</span>
          <strong>{formatCurrency(averageExpenseTicket)}</strong>
        </div>
        <div>
          <span className="detail-label">Ticket promedio de ingreso</span>
          <strong>{formatCurrency(averageIncomeTicket)}</strong>
        </div>
        <div>
          <span className="detail-label">Categoria dominante</span>
          <strong>{categoryBreakdown[0]?.label ?? "Sin datos"}</strong>
        </div>
        <div>
          <span className="detail-label">Metodo mas usado</span>
          <strong>{paymentBreakdown[0]?.label ?? "Sin datos"}</strong>
        </div>
      </div>

      <section className="analysis-card">
        <h3>Comparacion de ciclos</h3>
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

      <div className="analysis-grid">
        <section className="analysis-card">
          <h3>Gasto por categoria</h3>
          {categoryBreakdown.length === 0 ? (
            <p className="empty-state">No hay gastos en el filtro actual.</p>
          ) : (
            <div className="stack-list">
              {categoryBreakdown.map((item) => (
                <BreakdownRow key={item.label} label={item.label} item={item} />
              ))}
            </div>
          )}
        </section>

        <section className="analysis-card">
          <h3>Gasto por metodo de pago</h3>
          {paymentBreakdown.length === 0 ? (
            <p className="empty-state">No hay egresos para el filtro actual.</p>
          ) : (
            <div className="stack-list">
              {paymentBreakdown.map((item) => (
                <BreakdownRow key={item.label} label={item.label} item={item} />
              ))}
            </div>
          )}
        </section>
      </div>

      <section className="analysis-card">
        <h3>Top gastos del filtro</h3>
        {topExpenses.length === 0 ? (
          <p className="empty-state">No hay gastos registrados con los filtros actuales.</p>
        ) : (
          <div className="stack-list">
            {topExpenses.map((item) => (
              <article key={item.id} className="analysis-list-row">
                <div>
                  <strong>{item.description}</strong>
                  <p className="meta">
                    {item.category} · {paymentMethodLabel(item.paymentMethod)} · {formatDate(item.transactionAt)}
                  </p>
                </div>
                <strong>{formatCurrency(item.amount)}</strong>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="analysis-card">
        <h3>Tendencia de los ultimos 6 meses</h3>
        <div className="stack-list">
          {analytics.monthlyTrend.map((item) => (
            <article key={item.key} className="analysis-list-row">
              <div>
                <strong>{item.label}</strong>
                <p className="meta">
                  Ingresos {formatCurrency(item.income)} · Gastos {formatCurrency(item.expense)}
                </p>
              </div>
              <strong className={item.balance >= 0 ? "positive-text" : "negative-text"}>
                {formatCurrency(item.balance)}
              </strong>
            </article>
          ))}
        </div>
      </section>
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
