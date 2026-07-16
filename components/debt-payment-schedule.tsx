"use client";

import { useState } from "react";
import { buildDebtPaymentSchedule } from "@/lib/finance";
import { debtTypeLabel, formatCurrency, formatDate, formatPercent } from "@/lib/utils";

type DebtOption = {
  id: string;
  name: string;
  type: "FIXED_INSTALLMENT" | "REVOLVING_CREDIT" | "CREDIT_CARD";
  currentAmount: number;
  annualEffectiveRate: number | null;
  monthlyPayment: number | null;
  minimumPaymentAmount: number | null;
  startedAt: string | Date | null;
  firstPaymentAt: string | Date | null;
  dueDayOfMonth: number | null;
  installmentCount: number | null;
  payrollAutopayEnabled?: boolean;
};

export function DebtPaymentSchedule({ debts }: { debts: DebtOption[] }) {
  const [selectedDebtId, setSelectedDebtId] = useState(debts[0]?.id ?? "");
  const selectedDebt = debts.find((debt) => debt.id === selectedDebtId) ?? debts[0] ?? null;

  if (!selectedDebt) {
    return <p className="empty-state">Todavía no tienes deudas registradas para generar un plan de pagos.</p>;
  }

  const schedule = buildDebtPaymentSchedule({
    type: selectedDebt.type,
    balance: selectedDebt.currentAmount,
    annualEffectiveRate: selectedDebt.annualEffectiveRate,
    monthlyPayment: selectedDebt.monthlyPayment,
    minimumPaymentAmount: selectedDebt.minimumPaymentAmount,
    startedAt: selectedDebt.startedAt,
    firstPaymentAt: selectedDebt.firstPaymentAt,
    dueDayOfMonth: selectedDebt.dueDayOfMonth,
    installmentCount: selectedDebt.installmentCount,
    payrollAutopayEnabled: selectedDebt.payrollAutopayEnabled ?? false
  });

  const configuredPayment =
    selectedDebt.type === "FIXED_INSTALLMENT"
      ? selectedDebt.monthlyPayment
      : selectedDebt.minimumPaymentAmount ?? selectedDebt.monthlyPayment;

  return (
    <div className="stack-list">
      <div className="form-grid compact-form">
        <label>
          Deuda a consultar
          <select value={selectedDebtId} onChange={(event) => setSelectedDebtId(event.target.value)}>
            {debts.map((debt) => (
              <option key={debt.id} value={debt.id}>
                {debt.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="detail-grid">
        <div>
          <span className="detail-label">Producto</span>
          <strong>{selectedDebt.name}</strong>
          <p className="meta">{debtTypeLabel(selectedDebt.type)}</p>
        </div>
        <div>
          <span className="detail-label">Saldo tomado para el plan</span>
          <strong>{formatCurrency(selectedDebt.currentAmount)}</strong>
          <p className="meta">El cálculo parte del saldo actual registrado.</p>
        </div>
        <div>
          <span className="detail-label">Tasa EA</span>
          <strong>
            {selectedDebt.annualEffectiveRate !== null
              ? formatPercent(selectedDebt.annualEffectiveRate, 2)
              : "Sin tasa"}
          </strong>
          <p className="meta">Se usa para estimar interés mensual.</p>
        </div>
        <div>
          <span className="detail-label">Cuota base</span>
          <strong>{configuredPayment ? formatCurrency(configuredPayment) : "Sin cuota"}</strong>
          <p className="meta">
            {selectedDebt.type === "REVOLVING_CREDIT"
              ? "Para rotativos se usa el pago mínimo configurado."
              : "Cuota configurada en la deuda."}
          </p>
        </div>
      </div>

      {schedule.mode === "unsupported" ? (
        <div className="alert-chip warning">
          Las tarjetas de crédito no muestran un plan cerrado porque depende de nuevas compras, cortes y pagos futuros.
        </div>
      ) : null}

      {schedule.mode === "insufficient-payment" ? (
        <div className="alert-chip warning">
          La cuota configurada no alcanza para amortizar esta deuda. Ajusta el pago mensual o revisa la tasa.
        </div>
      ) : null}

      {schedule.mode === "empty" ? (
        <div className="alert-chip success">Esta deuda ya no tiene saldo pendiente.</div>
      ) : null}

      {schedule.rows.length > 0 ? (
        <>
          <div className="comparison-grid">
            <article className="scenario-card">
              <p className="section-kicker">Plan resultante</p>
              <h3>{schedule.summary.payoffMonths} cuota(s)</h3>
              <div className="detail-grid single-detail-grid">
                <div>
                  <span className="detail-label">Interés total estimado</span>
                  <strong>{formatCurrency(schedule.summary.totalInterest)}</strong>
                </div>
                <div>
                  <span className="detail-label">Capital total estimado</span>
                  <strong>{formatCurrency(schedule.summary.totalPrincipal)}</strong>
                </div>
                <div>
                  <span className="detail-label">Pago total estimado</span>
                  <strong>{formatCurrency(schedule.summary.totalPayment)}</strong>
                </div>
              </div>
            </article>
            <article className="scenario-card scenario-card-primary">
              <p className="section-kicker">Última cuota proyectada</p>
              <h3>{formatDate(schedule.rows[schedule.rows.length - 1].paymentDate)}</h3>
              <div className="detail-grid single-detail-grid">
                <div>
                  <span className="detail-label">Primera cuota mostrada</span>
                  <strong>{formatDate(schedule.rows[0].paymentDate)}</strong>
                </div>
                <div>
                  <span className="detail-label">Número inicial</span>
                  <strong>Cuota {schedule.rows[0].installmentNumber}</strong>
                </div>
                <div>
                  <span className="detail-label">Número final</span>
                  <strong>Cuota {schedule.rows[schedule.rows.length - 1].installmentNumber}</strong>
                </div>
              </div>
            </article>
          </div>

          <div className="schedule-table-shell">
            <table className="schedule-table">
              <thead>
                <tr>
                  <th>Cuota</th>
                  <th>Fecha</th>
                  <th>Saldo inicial</th>
                  <th>Interés</th>
                  <th>Capital</th>
                  <th>Pago</th>
                  <th>Saldo final</th>
                </tr>
              </thead>
              <tbody>
                {schedule.rows.map((row) => (
                  <tr key={`${row.installmentNumber}-${row.paymentDate.toISOString()}`}>
                    <td>#{row.installmentNumber}</td>
                    <td>{formatDate(row.paymentDate)}</td>
                    <td>{formatCurrency(row.openingBalance)}</td>
                    <td>{formatCurrency(row.interestAmount)}</td>
                    <td>{formatCurrency(row.principalAmount)}</td>
                    <td>{formatCurrency(row.paymentAmount)}</td>
                    <td>{formatCurrency(row.closingBalance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </div>
  );
}
