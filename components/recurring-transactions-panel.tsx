import { PaymentMethod, TransactionType } from "@prisma/client";
import {
  applyRecurringTransactionsAction,
  createRecurringTransactionAction,
  deleteRecurringTransactionAction,
  toggleRecurringTransactionAction
} from "@/app/actions";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { categoryLabel, formatCurrency, paymentMethodLabel } from "@/lib/utils";

function typeLabel(t: TransactionType) {
  return t === "INCOME" ? "Ingreso" : "Gasto";
}

function RecurringCategorySelect({ name }: { name: string }) {
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
  return (
    <select name={name} required>
      <option value="" disabled>
        Selecciona una categoría
      </option>
      {categories.map((category) => (
        <option key={category} value={category}>
          {categoryLabel(category)}
        </option>
      ))}
    </select>
  );
}

type RecurringRow = {
  id: string;
  description: string;
  amount: number;
  type: TransactionType;
  category: string;
  paymentMethod: PaymentMethod;
  dayOfMonth: number;
  isActive: boolean;
  lastPeriodKey: string | null;
  creditCardDebtId: string | null;
  creditCardDebtName: string | null;
};

export function RecurringTransactionsPanel({
  items,
  creditCardDebts
}: {
  items: RecurringRow[];
  creditCardDebts: Array<{ id: string; name: string }>;
}) {
  return (
    <div className="recurring-stack">
      <form action={applyRecurringTransactionsAction} className="recurring-apply-form">
        <input type="hidden" name="redirectTab" value="transactions" />
        <p className="meta">
          Genera los movimientos del mes actual para cada recurrente activo cuando ya llegó el día
          configurado y aún no se aplicó en este mes.
        </p>
        <PendingSubmitButton idleLabel="Aplicar recurrentes del mes" pendingLabel="Aplicando…" />
      </form>

      <form action={createRecurringTransactionAction} className="form-grid compact-form recurring-create-form">
        <input type="hidden" name="redirectTab" value="transactions" />
        <div className="form-legend">
          <span>
            <strong>*</strong> Nuevo movimiento recurrente (mensual)
          </span>
          <span>Se registrará automáticamente al pulsar &quot;Aplicar recurrentes del mes&quot;.</span>
        </div>
        <label>
          <span className="field-label-row">
            <span>
              Descripción <span className="field-required">*</span>
            </span>
            <span className="field-pill required">Obligatorio</span>
          </span>
          <input name="description" required placeholder="Ej. Suscripción streaming" />
        </label>
        <label>
          <span className="field-label-row">
            <span>
              Importe <span className="field-required">*</span>
            </span>
            <span className="field-pill required">Obligatorio</span>
          </span>
          <input name="amount" type="number" min="0.01" step="0.01" required />
        </label>
        <label>
          <span className="field-label-row">
            <span>Tipo</span>
            <span className="field-pill required">Obligatorio</span>
          </span>
          <select name="type" defaultValue="EXPENSE" required>
            <option value="EXPENSE">Gasto</option>
            <option value="INCOME">Ingreso</option>
          </select>
        </label>
        <label>
          <span className="field-label-row">
            <span>Categoría</span>
            <span className="field-pill required">Obligatorio</span>
          </span>
          <RecurringCategorySelect name="category" />
        </label>
        <label>
          <span className="field-label-row">
            <span>Medio de pago</span>
            <span className="field-pill required">Obligatorio</span>
          </span>
          <select name="paymentMethod" defaultValue="BANK_TRANSFER" required>
            <option value="BANK_TRANSFER">{paymentMethodLabel("BANK_TRANSFER")}</option>
            <option value="CASH">{paymentMethodLabel("CASH")}</option>
            <option value="DEBIT_CARD">{paymentMethodLabel("DEBIT_CARD")}</option>
            <option value="NEQUI">{paymentMethodLabel("NEQUI")}</option>
            <option value="DAVIPLATA">{paymentMethodLabel("DAVIPLATA")}</option>
            <option value="OTHER">{paymentMethodLabel("OTHER")}</option>
            <option value="CREDIT_CARD">{paymentMethodLabel("CREDIT_CARD")}</option>
          </select>
        </label>
        <label>
          <span className="field-label-row">
            <span>Día del mes (1–28)</span>
            <span className="field-pill required">Obligatorio</span>
          </span>
          <input name="dayOfMonth" type="number" min={1} max={28} defaultValue={1} required />
        </label>
        {creditCardDebts.length > 0 ? (
          <label>
            <span className="field-label-row">
              <span>Tarjeta (solo si medio = tarjeta)</span>
              <span className="field-pill optional">Opcional</span>
            </span>
            <select name="creditCardDebtId" defaultValue="">
              <option value="">—</option>
              {creditCardDebts.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <input type="hidden" name="creditCardDebtId" value="" />
        )}
        <PendingSubmitButton idleLabel="Guardar recurrente" pendingLabel="Guardando…" />
      </form>

      <div className="stack-list">
        {items.length === 0 ? (
          <p className="empty-state">Aún no tienes movimientos recurrentes. Crea uno arriba.</p>
        ) : (
          items.map((row) => (
            <article key={row.id} className="item-card recurring-row">
              <header>
                <div>
                  <h3>{row.description}</h3>
                  <p className="meta">
                    {formatCurrency(row.amount)} · {typeLabel(row.type)} · {categoryLabel(row.category)} ·{" "}
                    {paymentMethodLabel(row.paymentMethod)}
                    {row.paymentMethod === "CREDIT_CARD" && row.creditCardDebtName
                      ? ` · ${row.creditCardDebtName}`
                      : null}
                  </p>
                  <p className="meta">
                    Día {row.dayOfMonth} de cada mes ·{" "}
                    {row.isActive ? (
                      <span className="positive-text">Activo</span>
                    ) : (
                      <span className="negative-text">Pausado</span>
                    )}
                    {row.lastPeriodKey ? ` · Último periodo aplicado: ${row.lastPeriodKey}` : ""}
                  </p>
                </div>
                <div className="recurring-row-actions">
                  <form action={toggleRecurringTransactionAction}>
                    <input type="hidden" name="redirectTab" value="transactions" />
                    <input type="hidden" name="recurringId" value={row.id} />
                    <input type="hidden" name="nextActive" value={String(!row.isActive)} />
                    <PendingSubmitButton
                      className="ghost-button"
                      idleLabel={row.isActive ? "Pausar" : "Activar"}
                      pendingLabel="Actualizando…"
                    />
                  </form>
                  <form action={deleteRecurringTransactionAction}>
                    <input type="hidden" name="redirectTab" value="transactions" />
                    <input type="hidden" name="recurringId" value={row.id} />
                    <ConfirmSubmitButton
                      className="ghost-button destructive-button"
                      idleLabel="Eliminar"
                      pendingLabel="Eliminando…"
                      confirmTitle="¿Eliminar este recurrente?"
                      confirmDescription="No borra movimientos ya registrados."
                    />
                  </form>
                </div>
              </header>
            </article>
          ))
        )}
      </div>
    </div>
  );
}
