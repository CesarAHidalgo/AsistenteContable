"use client";

import { useMemo, useState } from "react";
import { runDebtSimulation } from "@/lib/finance";
import { formatCurrency, formatDate } from "@/lib/utils";

export function DebtSimulator() {
  const [balance, setBalance] = useState(10000000);
  const [annualRate, setAnnualRate] = useState(22);
  const [currentPayment, setCurrentPayment] = useState(500000);
  const [boostedPayment, setBoostedPayment] = useState(700000);
  const [startedAt, setStartedAt] = useState(new Date().toISOString().slice(0, 10));

  const baseScenario = useMemo(
    () =>
      runDebtSimulation({
        balance,
        annualEffectiveRate: annualRate,
        monthlyPayment: currentPayment,
        startedAt
      }),
    [annualRate, balance, currentPayment, startedAt]
  );

  const boostedScenario = useMemo(
    () =>
      runDebtSimulation({
        balance,
        annualEffectiveRate: annualRate,
        monthlyPayment: boostedPayment,
        startedAt
      }),
    [annualRate, balance, boostedPayment, startedAt]
  );

  return (
    <div className="stack-list">
      <div className="form-grid">
        <label>
          Saldo actual
          <input
            type="number"
            min="0"
            step="0.01"
            value={balance}
            onChange={(event) => setBalance(Number(event.target.value))}
          />
        </label>
        <label>
          Tasa EA (%)
          <input
            type="number"
            min="0"
            step="0.0001"
            value={annualRate}
            onChange={(event) => setAnnualRate(Number(event.target.value))}
          />
        </label>
        <label>
          Cuota actual
          <input
            type="number"
            min="0"
            step="0.01"
            value={currentPayment}
            onChange={(event) => setCurrentPayment(Number(event.target.value))}
          />
        </label>
        <label>
          Cuota aumentada
          <input
            type="number"
            min="0"
            step="0.01"
            value={boostedPayment}
            onChange={(event) => setBoostedPayment(Number(event.target.value))}
          />
        </label>
        <label>
          Fecha de inicio
          <input type="date" value={startedAt} onChange={(event) => setStartedAt(event.target.value)} />
        </label>
      </div>

      <div className="comparison-grid">
        <ScenarioCard
          title="Con tu cuota actual"
          payment={currentPayment}
          result={baseScenario}
        />
        <ScenarioCard
          title="Si aumentas la cuota"
          payment={boostedPayment}
          result={boostedScenario}
          accent="primary"
        />
      </div>

      {baseScenario.payoffMonths && boostedScenario.payoffMonths ? (
        <div className="simulation-banner">
          <strong>
            Subiendo la cuota ahorrarías {baseScenario.payoffMonths - boostedScenario.payoffMonths} mes(es)
          </strong>
          <span>
            y aproximadamente{" "}
            {formatCurrency(
              Math.max(
                0,
                (baseScenario.totalInterest ?? 0) - (boostedScenario.totalInterest ?? 0)
              )
            )}{" "}
            en intereses.
          </span>
        </div>
      ) : null}
    </div>
  );
}

function ScenarioCard({
  title,
  payment,
  result,
  accent
}: {
  title: string;
  payment: number;
  result: {
    payoffMonths: number | null;
    estimatedPayoffDate: string | Date | null;
    totalInterest: number | null;
  };
  accent?: "primary";
}) {
  return (
    <article className={`scenario-card ${accent ? `scenario-card-${accent}` : ""}`}>
      <p className="section-kicker">{title}</p>
      <h3>{formatCurrency(payment)}</h3>
      <div className="detail-grid single-detail-grid">
        <div>
          <span className="detail-label">Tiempo estimado</span>
          <strong>{result.payoffMonths ? `${result.payoffMonths} meses` : "No amortiza"}</strong>
        </div>
        <div>
          <span className="detail-label">Ultima cuota</span>
          <strong>{result.estimatedPayoffDate ? formatDate(result.estimatedPayoffDate) : "Sin fecha"}</strong>
        </div>
        <div>
          <span className="detail-label">Interes total</span>
          <strong>{result.totalInterest !== null ? formatCurrency(result.totalInterest) : "Sin estimar"}</strong>
        </div>
      </div>
    </article>
  );
}
