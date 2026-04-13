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
    txFrom?: string;
    txTo?: string;
    txCat?: string;
    txType?: string;
  };
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
          <span className="filter-label">Desde</span>
          <input type="date" name="txFrom" defaultValue={defaults.txFrom ?? ""} />
        </label>
        <label>
          <span className="filter-label">Hasta</span>
          <input type="date" name="txTo" defaultValue={defaults.txTo ?? ""} />
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
        <Link href={"/movimientos" as Route} className="inline-link" prefetch={false}>
          Limpiar
        </Link>
      </div>
    </form>
  );
}
