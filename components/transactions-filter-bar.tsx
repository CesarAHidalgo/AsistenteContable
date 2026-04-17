"use client";

import Link from "next/link";
import type { Route } from "next";
import { PendingSubmitButton } from "@/components/pending-submit-button";

const categories = [
  "",
  "Nomina",
  "Vivienda",
  "Servicios",
  "Mercado",
  "Restaurantes",
  "Transporte",
  "Combustible",
  "Salud",
  "Educacion",
  "Entretenimiento",
  "Deudas",
  "Ahorro",
  "Otros"
];

export function TransactionsFilterBar({
  defaults
}: {
  defaults: {
    txQ?: string;
    txCycle?: string;
    txCat?: string;
    txType?: string;
  };
  cycles: Array<{
    key: string;
    label: string;
    isCurrent: boolean;
  }>;
}) {
  return (
    <form method="get" action="/movimientos" className="transactions-filter-form">
      <div className="filter-grid">
        <label>
          <span className="filter-label">Buscar</span>
          <input
            type="search"
            name="txQ"
            placeholder="Texto en descripción o categoría"
            defaultValue={defaults.txQ ?? ""}
          />
        </label>
        <label>
          <span className="filter-label">Ciclo</span>
          <select name="txCycle" defaultValue={defaults.txCycle ?? ""}>
            {cycles.map((cycle) => (
              <option key={cycle.key} value={cycle.key}>
                {cycle.isCurrent ? `${cycle.label} (actual)` : cycle.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="filter-label">Categoría</span>
          <select name="txCat" defaultValue={defaults.txCat ?? ""}>
            <option value="">Todas</option>
            {categories
              .filter(Boolean)
              .map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
          </select>
        </label>
        <label>
          <span className="filter-label">Tipo</span>
          <select name="txType" defaultValue={defaults.txType ?? ""}>
            <option value="">Todos</option>
            <option value="INCOME">Ingreso</option>
            <option value="EXPENSE">Gasto</option>
          </select>
        </label>
      </div>
      <div className="filter-actions">
        <PendingSubmitButton idleLabel="Aplicar filtros" pendingLabel="Aplicando…" />
        <Link href={"/movimientos?tab=transactions" as Route} className="inline-link" prefetch={false}>
          Limpiar
        </Link>
      </div>
    </form>
  );
}
