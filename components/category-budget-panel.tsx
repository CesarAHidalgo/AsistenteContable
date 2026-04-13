import { upsertCategoryBudgetAction } from "@/app/actions";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { categoryLabel, formatCurrency } from "@/lib/utils";

const categories = [
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

type BudgetRow = {
  id: string;
  category: string;
  budgetAmount: number;
  spentAmount: number;
};

export function CategoryBudgetPanel({
  periodKey,
  rows
}: {
  periodKey: string;
  rows: BudgetRow[];
}) {
  return (
    <div className="budget-stack">
      <p className="meta">
        Presupuesto mensual por categoría (calendario <strong>{periodKey}</strong>). El gasto mostrado es del
        ciclo contable actual en el resumen.
      </p>
      <div className="stack-list">
        {rows.length > 0 ? (
          rows.map((row) => {
            const over = row.spentAmount > row.budgetAmount;
            return (
              <div key={row.id} className="snapshot-card budget-row">
                <span className="detail-label">{categoryLabel(row.category)}</span>
                <div className="budget-compare">
                  <span>
                    Gastado <strong>{formatCurrency(row.spentAmount)}</strong>
                  </span>
                  <span>
                    Meta <strong>{formatCurrency(row.budgetAmount)}</strong>
                  </span>
                  <span className={over ? "negative-text" : "positive-text"}>
                    {over
                      ? `Por encima ${formatCurrency(row.spentAmount - row.budgetAmount)}`
                      : `Disponible ${formatCurrency(Math.max(0, row.budgetAmount - row.spentAmount))}`}
                  </span>
                </div>
              </div>
            );
          })
        ) : (
          <p className="empty-state">Aún no hay metas por categoría para este mes.</p>
        )}
      </div>

      <form action={upsertCategoryBudgetAction} className="form-grid compact-form budget-add-form">
        <input type="hidden" name="redirectTab" value="overview" />
        <input type="hidden" name="periodKey" value={periodKey} />
        <label>
          <span className="filter-label">Categoría</span>
          <select name="category" required defaultValue="">
            <option value="" disabled>
              Elegir…
            </option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {categoryLabel(c)}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="filter-label">Importe mensual (0 = quitar meta)</span>
          <input name="amount" type="number" min={0} step="0.01" placeholder="0" />
        </label>
        <PendingSubmitButton idleLabel="Guardar meta" pendingLabel="Guardando…" />
      </form>
    </div>
  );
}
