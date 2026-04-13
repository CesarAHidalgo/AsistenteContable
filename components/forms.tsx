"use client";

import { useActionState, useState } from "react";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { DebtType, PaymentMethod, ReminderType, TransactionType } from "@prisma/client";
import {
  createApiTokenAction,
  type CreateApiTokenState,
  createDebtAction,
  createDebtPaymentAction,
  deleteDebtAction,
  deleteDebtPaymentAction,
  deleteTransactionAction,
  createReminderAction,
  createTransactionAction,
  registerAction,
  revokeApiTokenAction,
  updateBillingCycleAction,
  updateDebtAction,
  updateDebtPaymentAction,
  updateTransactionAction
} from "@/app/actions";
import {
  debtTypeOptions,
  formatDateInput,
  paymentMethodOptions,
  transactionTypeOptions
} from "@/lib/serializers";
import { categoryLabel, debtTypeLabel, formatCurrency, formatDate, formatDateTime, paymentMethodLabel } from "@/lib/utils";

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

function CategorySelect({
  name,
  defaultValue,
  required = false
}: {
  name: string;
  defaultValue?: string;
  required?: boolean;
}) {
  return (
    <select name={name} defaultValue={defaultValue ?? ""} required={required}>
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

export function TransactionForm({
  redirectTab,
  creditCardDebts
}: {
  redirectTab: string;
  creditCardDebts: Array<{
    id: string;
    name: string;
    statementDayOfMonth: number | null;
    dueDayOfMonth: number | null;
    statementDayPurchasesToNextCycle: boolean;
  }>;
}) {
  const today = formatDateInput(new Date());
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("BANK_TRANSFER");
  const [transactionDate, setTransactionDate] = useState(today);
  const [selectedCreditCardDebtId, setSelectedCreditCardDebtId] = useState("");
  const [cycleSelection, setCycleSelection] = useState<"CURRENT_STATEMENT" | "NEXT_STATEMENT">(
    "CURRENT_STATEMENT"
  );
  const selectedCreditCard =
    creditCardDebts.find((debt) => debt.id === selectedCreditCardDebtId) ?? null;
  const cyclePreview = selectedCreditCard
    ? getCreditCardCyclePreview(selectedCreditCard, new Date(`${transactionDate}T12:00:00`))
    : null;

  return (
    <form action={createTransactionAction} className="form-grid">
      <input type="hidden" name="redirectTab" value={redirectTab} />
      <FormLegend />

      <FieldLabel label="Tipo" required>
        <select name="type" defaultValue={"EXPENSE" as TransactionType}>
          {transactionTypeOptions().map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </FieldLabel>

      <FieldLabel label="Descripcion" required>
        <input name="description" required />
      </FieldLabel>

      <FieldLabel label="Valor" required>
        <input name="amount" type="number" min="0" step="0.01" required />
      </FieldLabel>

      <FieldLabel label="Categoria" required>
        <CategorySelect name="category" required />
      </FieldLabel>

      <FieldLabel label="Metodo de pago" required>
        <select
          name="paymentMethod"
          value={paymentMethod}
          onChange={(event) => setPaymentMethod(event.target.value as PaymentMethod)}
        >
          {paymentMethodOptions().map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </FieldLabel>

      {paymentMethod === "CREDIT_CARD" ? (
        <>
          <FieldLabel
            label="Numero de cuotas"
            required
            help="Solo para compras hechas con tarjeta de credito."
          >
            <input name="installmentCount" type="number" min="1" step="1" defaultValue="1" required />
          </FieldLabel>

          <FieldLabel
            label="Tarjeta de credito"
            required
            help="La compra se asocia a esta tarjeta para calcular a que corte y pago pertenece."
          >
            <select
              name="creditCardDebtId"
              value={selectedCreditCardDebtId}
              onChange={(event) => setSelectedCreditCardDebtId(event.target.value)}
              required
            >
              <option value="">Selecciona una tarjeta</option>
              {creditCardDebts.map((debt) => (
                <option key={debt.id} value={debt.id}>
                  {debt.name}
                </option>
              ))}
            </select>
          </FieldLabel>

          <FieldLabel
            label="Corte al que se enviara la compra"
            required
            help="Las compras con tarjeta no afectan tu balance del mes; aumentan el saldo de la tarjeta y se reflejan cuando pagas la deuda."
          >
            <select
              name="creditCardCycleSelection"
              value={cycleSelection}
              onChange={(event) =>
                setCycleSelection(event.target.value as "CURRENT_STATEMENT" | "NEXT_STATEMENT")
              }
              required
            >
              <option value="CURRENT_STATEMENT">
                {cyclePreview
                  ? `Corte actual: ${formatDate(cyclePreview.currentStatementDate)} -> pago ${formatDate(cyclePreview.currentPaymentDate)}`
                  : "Corte actual"}
              </option>
              <option value="NEXT_STATEMENT">
                {cyclePreview
                  ? `Siguiente corte: ${formatDate(cyclePreview.nextStatementDate)} -> pago ${formatDate(cyclePreview.nextPaymentDate)}`
                  : "Siguiente corte"}
              </option>
            </select>
          </FieldLabel>

          {selectedCreditCard && cyclePreview ? (
            <div className="form-legend">
              <span>
                {selectedCreditCard.statementDayPurchasesToNextCycle
                  ? "Las compras hechas exactamente el dia del corte pasan al siguiente corte."
                  : "Las compras hechas exactamente el dia del corte entran al corte actual."}
              </span>
            </div>
          ) : null}
        </>
      ) : null}

      <FieldLabel label="Fecha" required>
        <input
          name="transactionAt"
          type="date"
          value={transactionDate}
          onChange={(event) => setTransactionDate(event.target.value)}
          required
        />
      </FieldLabel>

      <ConfirmSubmitButton
        idleLabel="Guardar movimiento"
        pendingLabel="Guardando..."
        confirmTitle="Vas a crear un movimiento nuevo."
        confirmDescription="Revisa el resumen antes de guardarlo."
        summaryFields={[
          { name: "type", label: "Tipo" },
          { name: "description", label: "Descripción" },
          { name: "amount", label: "Valor" },
          { name: "category", label: "Categoría" },
          { name: "paymentMethod", label: "Método de pago" },
          { name: "transactionAt", label: "Fecha" }
        ]}
      />
    </form>
  );
}

export function DebtForm({ redirectTab }: { redirectTab: string }) {
  const [debtType, setDebtType] = useState<DebtType>("FIXED_INSTALLMENT");
  const isFixed = debtType === "FIXED_INSTALLMENT";
  const isRevolving = debtType === "REVOLVING_CREDIT";
  const isCreditCard = debtType === "CREDIT_CARD";
  const initialAmountLabel = isCreditCard ? "Saldo inicial a controlar" : "Valor inicial del credito";
  const currentAmountLabel = isCreditCard ? "Saldo actual de la tarjeta" : "Valor de deuda actual";
  const initialAmountHelp = isCreditCard
    ? "Si empiezas a llevar control desde hoy, puedes poner el mismo valor del saldo actual."
    : "Valor con el que nacio la deuda o el saldo que quieres tomar como punto de partida.";
  const monthlyPaymentLabel = isCreditCard ? "Pago minimo base" : "Cuota mensual esperada";
  const monthlyPaymentHelp = isCreditCard
    ? "Es el valor base desde el que quieres arrancar el pago minimo proyectado de la tarjeta. La app le suma las cuotas de las compras que caen en el corte actual."
    : undefined;

  return (
    <form action={createDebtAction} className="form-grid">
      <input type="hidden" name="redirectTab" value={redirectTab} />
      <FormLegend />

      <FieldLabel label="Tipo de deuda" required>
        <select
          name="type"
          value={debtType}
          onChange={(event) => setDebtType(event.target.value as DebtType)}
        >
          {debtTypeOptions().map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </FieldLabel>

      <FieldLabel label="Nombre del producto" required>
        <input name="name" placeholder="Libre inversion Bancolombia" required />
      </FieldLabel>

      <div className="form-section-title">Base de la deuda</div>

      <FieldLabel
        label={initialAmountLabel}
        required={!isCreditCard}
        optional={isCreditCard}
        help={initialAmountHelp}
      >
        <input name="initialAmount" type="number" min="0" step="0.01" required={!isCreditCard} />
      </FieldLabel>

      <FieldLabel label={currentAmountLabel} required>
        <input name="currentAmount" type="number" min="0" step="0.01" required />
      </FieldLabel>

      <FieldLabel
        label="Fecha de inicio del credito"
        required={isFixed}
        optional={!isFixed}
        help="Si la completas, podremos estimar mejor la ultima cuota y las cuotas pagadas."
      >
        <input
          name="startedAt"
          type="date"
          defaultValue={formatDateInput(new Date())}
          required={isFixed}
        />
      </FieldLabel>

      <FieldLabel
        label="Tasa EA (%)"
        required={isFixed || isRevolving}
        optional={isCreditCard}
        help="Usa la tasa base que quieres tomar para las proyecciones."
      >
        <input name="annualEffectiveRate" type="number" min="0" step="0.0001" required={isFixed || isRevolving} />
      </FieldLabel>

      <FieldLabel
        label="Numero de cuotas pactadas"
        required={isFixed}
        optional={!isFixed}
        help="En tarjeta o rotativo puedes dejarlo vacio si no existe un plan fijo."
      >
        <input name="installmentCount" type="number" min="1" step="1" required={isFixed} />
      </FieldLabel>

      <div className="form-section-title">Pago programado</div>

      <FieldLabel
        label={monthlyPaymentLabel}
        required={isFixed}
        optional={!isFixed}
        help={monthlyPaymentHelp}
      >
        <input
          name="monthlyPayment"
          type="number"
          min="0"
          step="0.01"
          required={isFixed}
        />
      </FieldLabel>

      <FieldLabel label="Dia de pago" required={isFixed || isCreditCard} optional={isRevolving}>
        <input name="dueDayOfMonth" type="number" min="1" max="31" required={isFixed || isCreditCard} />
      </FieldLabel>

      {(isRevolving || isCreditCard) ? (
        <>
          <div className="form-section-title">Control de cupo</div>

          <FieldLabel label="Cupo total" required={isCreditCard} optional={isRevolving}>
            <input name="creditLimit" type="number" min="0" step="0.01" required={isCreditCard} />
          </FieldLabel>
        </>
      ) : null}

      {isRevolving ? (
        <FieldLabel
          label="Valor minimo esperado"
          required
          help="Escribe el valor minimo real o el valor que quieres usar como referencia."
        >
          <input name="minimumPaymentAmount" type="number" min="0" step="0.01" required />
        </FieldLabel>
      ) : null}

      {isCreditCard ? (
        <>
          <div className="form-section-title">Corte de tarjeta</div>

          <FieldLabel label="Dia de corte" required>
            <input name="statementDayOfMonth" type="number" min="1" max="31" required />
          </FieldLabel>

          <FieldLabel
            label="Pago minimo informado por el banco"
            required
            help="Valor de referencia que reporta el banco en el extracto. No reemplaza el minimo base que usas para proyectar tu pago."
          >
            <input name="minimumPaymentAmount" type="number" min="0" step="0.01" required />
          </FieldLabel>

          <FieldLabel
            label="Compra hecha el dia del corte"
            required
            help="Indica si una compra realizada exactamente el dia del corte entra al siguiente pago o al corte actual."
          >
            <select name="statementDayPurchasesToNextCycle" defaultValue="true">
              <option value="true">Van al siguiente pago</option>
              <option value="false">Entran en este mismo corte</option>
            </select>
          </FieldLabel>
        </>
      ) : null}

      <ConfirmSubmitButton
        idleLabel="Crear deuda"
        pendingLabel="Creando..."
        confirmTitle="Vas a registrar una deuda nueva."
        confirmDescription="Confirma que el saldo, tasa y condiciones estén correctos."
        summaryFields={[
          { name: "type", label: "Tipo de deuda" },
          { name: "name", label: "Producto" },
          { name: "initialAmount", label: "Saldo inicial" },
          { name: "currentAmount", label: "Saldo actual" },
          { name: "monthlyPayment", label: "Pago mensual/base" },
          { name: "dueDayOfMonth", label: "Día de pago" }
        ]}
      />
    </form>
  );
}

export function BillingCycleForm({
  redirectTab,
  billingCycleReferenceStart,
  billingCycleReferenceEnd
}: {
  redirectTab: string;
  billingCycleReferenceStart: string;
  billingCycleReferenceEnd: string;
}) {
  return (
    <form action={updateBillingCycleAction} className="form-grid compact-form">
      <input type="hidden" name="redirectTab" value={redirectTab} />
      <FormLegend />

      <FieldLabel label="Fecha exacta de inicio" required>
        <input
          name="billingCycleReferenceStart"
          type="date"
          defaultValue={billingCycleReferenceStart}
          required
        />
      </FieldLabel>

      <FieldLabel label="Fecha exacta de fin" required>
        <input
          name="billingCycleReferenceEnd"
          type="date"
          defaultValue={billingCycleReferenceEnd}
          required
        />
      </FieldLabel>

      <ConfirmSubmitButton
        idleLabel="Actualizar ciclo"
        pendingLabel="Actualizando..."
        confirmTitle="Vas a cambiar el ciclo de facturación."
        summaryFields={[
          { name: "billingCycleReferenceStart", label: "Fecha de inicio" },
          { name: "billingCycleReferenceEnd", label: "Fecha de fin" }
        ]}
      />
    </form>
  );
}

export function ReminderForm() {
  const now = new Date();
  const [reminderType, setReminderType] = useState<ReminderType>("PAYMENT");
  const isPayment = reminderType === "PAYMENT";

  return (
    <form action={createReminderAction} className="form-grid">
      <FormLegend />

      <FieldLabel label="Tipo de recordatorio" required>
        <select
          name="type"
          value={reminderType}
          onChange={(event) => setReminderType(event.target.value as ReminderType)}
        >
          <option value="PAYMENT">Pago</option>
          <option value="ALARM">Alarma</option>
        </select>
      </FieldLabel>

      <FieldLabel label="Titulo" required>
        <input name="title" required />
      </FieldLabel>

      <FieldLabel label="Valor estimado" optional>
        <input name="amount" type="number" min="0" step="0.01" />
      </FieldLabel>

      <FieldLabel
        label={isPayment ? "Fecha de pago" : "Fecha de referencia"}
        required
        help={isPayment ? "Se usa para calcular desde cuando empieza la ventana de aviso." : "Sirve como fecha base del recordatorio."}
      >
        <input name="dueDate" type="date" defaultValue={formatDateInput(now)} required />
      </FieldLabel>

      {isPayment ? (
        <FieldLabel
          label="Dias previos para avisar"
          required
          help="Si pones 5 y la fecha de pago es el 6, la app notificara del 1 al 5 y se detendra si marcas el pago como realizado."
        >
          <input name="notifyDaysBefore" type="number" min="1" max="30" step="1" defaultValue="5" required />
        </FieldLabel>
      ) : (
        <FieldLabel
          label="Fecha y hora de la alarma"
          required
          help="Ese momento exacto sera el disparador de la notificacion."
        >
          <input
            name="notificationAt"
            type="datetime-local"
            defaultValue={toDateTimeLocalValue(now)}
            required
          />
        </FieldLabel>
      )}

      <div className="form-section-title">Canales de notificacion</div>

      <CheckLabel label="Correo" required defaultChecked name="notifyEmail" />
      <CheckLabel
        label="Notificacion push"
        optional
        name="notifyPush"
        help="Queda preparado para activarlo cuando registres una suscripcion web push."
      />
      <CheckLabel
        label="WhatsApp"
        optional
        name="notifyWhatsApp"
        help="Requiere configurar credenciales del proveedor en el servidor."
      />

      <button type="submit">Crear recordatorio</button>
    </form>
  );
}

export function DebtPaymentForm({
  redirectTab,
  debts
}: {
  redirectTab: string;
  debts: Array<{ id: string; name: string; currentAmount: number }>;
}) {
  return (
    <form action={createDebtPaymentAction} className="form-grid">
      <input type="hidden" name="redirectTab" value={redirectTab} />
      <FormLegend />

      <FieldLabel label="Deuda" required>
        <select name="debtId" required>
          {debts
            .filter((debt) => debt.currentAmount > 0)
            .map((debt) => (
              <option key={debt.id} value={debt.id}>
                {debt.name}
              </option>
            ))}
        </select>
      </FieldLabel>

      <FieldLabel label="Valor pagado" required>
        <input name="amount" type="number" min="0" step="0.01" required />
      </FieldLabel>

      <FieldLabel label="Fecha" required>
        <input name="paidAt" type="date" defaultValue={formatDateInput(new Date())} required />
      </FieldLabel>

      <ConfirmSubmitButton
        idleLabel="Aplicar pago"
        pendingLabel="Aplicando..."
        confirmTitle="Vas a registrar un pago sobre una deuda."
        confirmDescription="La app actualizará el saldo y dejará el movimiento asociado."
        summaryFields={[
          { name: "debtId", label: "Deuda" },
          { name: "amount", label: "Valor pagado" },
          { name: "paidAt", label: "Fecha" }
        ]}
      />
    </form>
  );
}

export function DebtManagementPanel({
  redirectTab,
  debts
}: {
  redirectTab: string;
  debts: Array<{
    id: string;
    name: string;
    type: DebtType;
    initialAmount: number;
    currentAmount: number;
    installmentCount: number | null;
    startedAt: string | Date | null;
    annualEffectiveRate: number | null;
    monthlyPayment: number | null;
    creditLimit: number | null;
    minimumPaymentAmount: number | null;
    dueDayOfMonth: number | null;
    statementDayOfMonth: number | null;
    statementDayPurchasesToNextCycle: boolean;
    payments: Array<{
      id: string;
      amount: number;
      principalAmount: number;
      interestAmount: number;
      paidAt: string | Date;
    }>;
  }>;
}) {
  if (debts.length === 0) {
    return <p className="empty-state">Todavia no has agregado deudas para administrar.</p>;
  }

  return (
    <div className="stack-list">
      {debts.map((debt) => (
        <details key={debt.id} className="item-card">
          <summary className="statement-purchase-summary">
            <div>
              <strong>{debt.name}</strong>
              <p className="meta">
                {debtTypeLabel(debt.type)} · saldo {formatCurrency(debt.currentAmount)} ·{" "}
                {debt.payments.length} pago(s)
              </p>
            </div>
            <span className="chip neutral">
              {formatCurrency(debt.monthlyPayment ?? debt.minimumPaymentAmount ?? debt.currentAmount)}
            </span>
          </summary>

          <div className="statement-purchase-body">
            <details className="inline-editor">
              <summary>Editar deuda</summary>
              <form action={updateDebtAction} className="form-grid compact-form inline-form">
                <input type="hidden" name="redirectTab" value={redirectTab} />
                <input type="hidden" name="debtId" value={debt.id} />
                <FieldLabel label="Tipo" required>
                  <select name="type" defaultValue={debt.type}>
                    {debtTypeOptions().map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </FieldLabel>
                <FieldLabel label="Nombre" required>
                  <input name="name" defaultValue={debt.name} required />
                </FieldLabel>
                <FieldLabel label="Saldo inicial" required>
                  <input name="initialAmount" type="number" min="0" step="0.01" defaultValue={debt.initialAmount} required />
                </FieldLabel>
                <FieldLabel label="Saldo actual" required>
                  <input name="currentAmount" type="number" min="0" step="0.01" defaultValue={debt.currentAmount} required />
                </FieldLabel>
                <FieldLabel label="Cuotas pactadas" optional>
                  <input name="installmentCount" type="number" min="1" step="1" defaultValue={debt.installmentCount ?? ""} />
                </FieldLabel>
                <FieldLabel label="Fecha de inicio" optional>
                  <input
                    name="startedAt"
                    type="date"
                    defaultValue={debt.startedAt ? formatDateInput(new Date(debt.startedAt)) : ""}
                  />
                </FieldLabel>
                <FieldLabel label="Tasa EA (%)" optional>
                  <input
                    name="annualEffectiveRate"
                    type="number"
                    min="0"
                    step="0.0001"
                    defaultValue={debt.annualEffectiveRate ?? ""}
                  />
                </FieldLabel>
                <FieldLabel label="Pago mensual / base" optional>
                  <input
                    name="monthlyPayment"
                    type="number"
                    min="0"
                    step="0.01"
                    defaultValue={debt.monthlyPayment ?? ""}
                  />
                </FieldLabel>
                <FieldLabel label="Cupo total" optional>
                  <input
                    name="creditLimit"
                    type="number"
                    min="0"
                    step="0.01"
                    defaultValue={debt.creditLimit ?? ""}
                  />
                </FieldLabel>
                <FieldLabel label="Pago minimo" optional>
                  <input
                    name="minimumPaymentAmount"
                    type="number"
                    min="0"
                    step="0.01"
                    defaultValue={debt.minimumPaymentAmount ?? ""}
                  />
                </FieldLabel>
                <FieldLabel label="Dia de pago" optional>
                  <input name="dueDayOfMonth" type="number" min="1" max="31" defaultValue={debt.dueDayOfMonth ?? ""} />
                </FieldLabel>
                <FieldLabel label="Dia de corte" optional>
                  <input
                    name="statementDayOfMonth"
                    type="number"
                    min="1"
                    max="31"
                    defaultValue={debt.statementDayOfMonth ?? ""}
                  />
                </FieldLabel>
                <FieldLabel label="Compras en dia de corte" optional>
                  <select name="statementDayPurchasesToNextCycle" defaultValue={String(debt.statementDayPurchasesToNextCycle)}>
                    <option value="true">Van al siguiente pago</option>
                    <option value="false">Entran en este mismo corte</option>
                  </select>
                </FieldLabel>
                <ConfirmSubmitButton
                  idleLabel="Guardar deuda"
                  pendingLabel="Guardando..."
                  confirmTitle={`Vas a actualizar la deuda ${debt.name}.`}
                  confirmDescription="Revisa el resumen antes de guardar los cambios."
                  summaryFields={[
                    { name: "name", label: "Nombre" },
                    { name: "currentAmount", label: "Saldo actual" },
                    { name: "monthlyPayment", label: "Pago mensual/base" },
                    { name: "minimumPaymentAmount", label: "Pago mínimo" }
                  ]}
                />
              </form>
            </details>

            <details className="inline-editor">
              <summary>Eliminar deuda</summary>
              <form action={deleteDebtAction} className="form-grid compact-form inline-form">
                <input type="hidden" name="redirectTab" value={redirectTab} />
                <input type="hidden" name="debtId" value={debt.id} />
                <p className="meta">
                  Esto elimina la deuda y sus pagos asociados. Los movimientos historicos se conservan.
                </p>
                <ConfirmSubmitButton
                  className="ghost-button destructive-button"
                  idleLabel="Eliminar deuda"
                  pendingLabel="Eliminando..."
                  confirmTitle={`Vas a eliminar la deuda ${debt.name}.`}
                  confirmDescription="También se eliminarán sus pagos asociados."
                />
              </form>
            </details>

            <div className="stack-list">
              {debt.payments.length === 0 ? (
                <p className="empty-state">No hay pagos registrados para esta deuda.</p>
              ) : (
                debt.payments.map((payment) => (
                  <details key={payment.id} className="inline-editor">
                    <summary className="analysis-list-row">
                      <div>
                        <strong>{formatCurrency(payment.amount)}</strong>
                        <p className="meta">
                          Pagado {formatDateTime(payment.paidAt)} · capital {formatCurrency(payment.principalAmount)} · interes{" "}
                          {formatCurrency(payment.interestAmount)}
                        </p>
                      </div>
                    </summary>

                    <div className="statement-purchase-body">
                      <form action={updateDebtPaymentAction} className="form-grid compact-form inline-form">
                        <input type="hidden" name="redirectTab" value={redirectTab} />
                        <input type="hidden" name="paymentId" value={payment.id} />
                        <input type="hidden" name="debtId" value={debt.id} />
                        <FieldLabel label="Valor pagado" required>
                          <input name="amount" type="number" min="0" step="0.01" defaultValue={payment.amount} required />
                        </FieldLabel>
                        <FieldLabel label="Fecha de pago" required>
                          <input
                            name="paidAt"
                            type="date"
                            defaultValue={formatDateInput(new Date(payment.paidAt))}
                            required
                          />
                        </FieldLabel>
                        <ConfirmSubmitButton
                          idleLabel="Guardar pago"
                          pendingLabel="Guardando..."
                          confirmTitle={`Vas a actualizar un pago de ${debt.name}.`}
                          summaryFields={[
                            { name: "amount", label: "Valor pagado" },
                            { name: "paidAt", label: "Fecha de pago" }
                          ]}
                        />
                      </form>

                      <form action={deleteDebtPaymentAction} className="form-grid compact-form inline-form">
                        <input type="hidden" name="redirectTab" value={redirectTab} />
                        <input type="hidden" name="paymentId" value={payment.id} />
                        <input type="hidden" name="debtId" value={debt.id} />
                        <ConfirmSubmitButton
                          className="ghost-button destructive-button"
                          idleLabel="Eliminar pago"
                          pendingLabel="Eliminando..."
                          confirmTitle={`Vas a eliminar un pago de ${debt.name}.`}
                          confirmDescription="Esta acción revertirá el capital aplicado a la deuda."
                        />
                      </form>
                    </div>
                  </details>
                ))
              )}
            </div>
          </div>
        </details>
      ))}
    </div>
  );
}

export function TransactionManagementPanel({
  transactions
}: {
  transactions: Array<{
    id: string;
    description: string;
    amount: number;
    type: TransactionType;
    category: string;
    paymentMethod: PaymentMethod;
    installmentCount: number | null;
    transactionAt: string | Date;
    creditCardDebt?: { name: string } | null;
  }>;
}) {
  if (transactions.length === 0) {
    return <p className="empty-state">Todavia no tienes movimientos para administrar.</p>;
  }

  return (
    <div className="stack-list">
      {transactions.map((transaction) => {
        const isCreditCard = transaction.paymentMethod === "CREDIT_CARD";
        return (
          <details key={transaction.id} className="item-card">
            <summary className="statement-purchase-summary">
              <div>
                <strong>{transaction.description}</strong>
                <p className="meta">
                  {categoryLabel(transaction.category)} · {paymentMethodLabel(transaction.paymentMethod)} · {formatDate(transaction.transactionAt)}
                  {transaction.installmentCount ? ` · ${transaction.installmentCount} cuota(s)` : ""}
                </p>
                {isCreditCard && transaction.creditCardDebt ? (
                  <p className="meta">{transaction.creditCardDebt.name}</p>
                ) : null}
              </div>
              <span className={`chip ${transaction.type === "INCOME" ? "income" : "expense"}`}>
                {formatCurrency(transaction.amount)}
              </span>
            </summary>

            <div className="statement-purchase-body">
              <details className="inline-editor">
                <summary>Editar movimiento</summary>
                <form action={updateTransactionAction} className="form-grid compact-form inline-form">
                  <input type="hidden" name="transactionId" value={transaction.id} />
                  <input type="hidden" name="paymentMethod" value={transaction.paymentMethod} />
                  <input type="hidden" name="creditCardDebtName" value={transaction.creditCardDebt?.name ?? ""} />

                  <FieldLabel label="Descripcion" required>
                    <input name="description" defaultValue={transaction.description} required />
                  </FieldLabel>

                  <FieldLabel label="Valor" required>
                    <input name="amount" type="number" min="0" step="0.01" defaultValue={transaction.amount} required />
                  </FieldLabel>

                  <FieldLabel label="Tipo" required>
                    <select name="type" defaultValue={transaction.type}>
                      {transactionTypeOptions().map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </FieldLabel>

                  <FieldLabel label="Categoria" required>
                    <CategorySelect name="category" defaultValue={transaction.category} required />
                  </FieldLabel>

                  <FieldLabel label="Fecha" required>
                    <input
                      name="transactionAt"
                      type="date"
                      defaultValue={formatDateInput(new Date(transaction.transactionAt))}
                      required
                    />
                  </FieldLabel>

                  {isCreditCard ? (
                    <FieldLabel label="Numero de cuotas" optional>
                      <input
                        name="installmentCount"
                        type="number"
                        min="1"
                        step="1"
                        defaultValue={transaction.installmentCount ?? ""}
                      />
                    </FieldLabel>
                  ) : null}

                  <button type="submit">Guardar movimiento</button>
                </form>
              </details>

              <details className="inline-editor">
                <summary>Eliminar movimiento</summary>
                <form action={deleteTransactionAction} className="form-grid compact-form inline-form">
                  <input type="hidden" name="transactionId" value={transaction.id} />
                  <p className="meta">
                    Esto elimina el movimiento y, si pertenece a una tarjeta, revierte el impacto sobre la deuda.
                  </p>
                  <button type="submit" className="ghost-button destructive-button">
                    Confirmar eliminacion
                  </button>
                </form>
              </details>
            </div>
          </details>
        );
      })}
    </div>
  );
}

export function ApiTokenForm() {
  const [state, formAction, pending] = useActionState<CreateApiTokenState, FormData>(
    createApiTokenAction,
    null
  );

  return (
    <>
      <form action={formAction} className="form-grid compact-form">
        <FormLegend />

        <FieldLabel label="Nombre de la integracion" required>
          <input name="name" placeholder="Shortcut iPhone" required disabled={pending} />
        </FieldLabel>

        <button type="submit" disabled={pending}>
          {pending ? "Generando…" : "Generar token"}
        </button>
      </form>
      {state?.token ? (
        <div className="token-banner">
          <p>
            <strong>Guarda este token ahora.</strong> No volverá a mostrarse.
          </p>
          <code>{state.token}</code>
        </div>
      ) : null}
      {state?.error ? <div className="error-banner">{state.error}</div> : null}
    </>
  );
}

export function RevokeTokenForm({ tokenId }: { tokenId: string }) {
  return (
    <form action={revokeApiTokenAction}>
      <input type="hidden" name="tokenId" value={tokenId} />
      <button type="submit" className="ghost-button">
        Revocar
      </button>
    </form>
  );
}

export function RegisterForm() {
  return (
    <form action={registerAction} className="form-grid">
      <FormLegend />

      <FieldLabel label="Nombre" required>
        <input name="name" required />
      </FieldLabel>

      <FieldLabel label="Correo" required>
        <input name="email" type="email" required />
      </FieldLabel>

      <FieldLabel label="Contraseña" required>
        <input name="password" type="password" minLength={8} required />
      </FieldLabel>

      <FieldLabel label="Confirmar contraseña" required>
        <input name="confirmPassword" type="password" minLength={8} required />
      </FieldLabel>

      <button type="submit">Crear cuenta</button>
    </form>
  );
}

function FieldLabel({
  label,
  required = false,
  optional = false,
  help,
  children
}: {
  label: string;
  required?: boolean;
  optional?: boolean;
  help?: string;
  children: React.ReactNode;
}) {
  return (
    <label>
      <span className="field-label-row">
        <span>
          {label}
          {required ? <span className="field-required"> *</span> : null}
        </span>
        <span className={`field-pill ${required ? "required" : "optional"}`}>
          {required ? "Obligatorio" : optional ? "Opcional" : "Dato"}
        </span>
      </span>
      {children}
      {help ? <span className="field-help">{help}</span> : null}
    </label>
  );
}

function CheckLabel({
  label,
  name,
  defaultChecked = false,
  required = false,
  optional = false,
  help
}: {
  label: string;
  name: string;
  defaultChecked?: boolean;
  required?: boolean;
  optional?: boolean;
  help?: string;
}) {
  return (
    <label className="checkbox-label">
      <span className="field-label-row">
        <span>
          {label}
          {required ? <span className="field-required"> *</span> : null}
        </span>
        <span className={`field-pill ${required ? "required" : "optional"}`}>
          {required ? "Obligatorio" : optional ? "Opcional" : "Dato"}
        </span>
      </span>
      <span className="checkbox-row">
        <input name={name} type="checkbox" defaultChecked={defaultChecked} />
        <span>Activar canal</span>
      </span>
      {help ? <span className="field-help">{help}</span> : null}
    </label>
  );
}

function FormLegend() {
  return (
    <div className="form-legend">
      <span>
        <strong>*</strong> Campo obligatorio
      </span>
      <span>Los demas campos indican si son opcionales o solo de referencia.</span>
    </div>
  );
}

function toDateTimeLocalValue(value: Date) {
  const offset = value.getTimezoneOffset();
  const normalized = new Date(value.getTime() - offset * 60_000);
  return normalized.toISOString().slice(0, 16);
}

function getCreditCardCyclePreview(
  debt: {
    statementDayOfMonth: number | null;
    dueDayOfMonth: number | null;
    statementDayPurchasesToNextCycle: boolean;
  },
  transactionDate: Date
) {
  if (!debt.statementDayOfMonth || !debt.dueDayOfMonth) {
    return null;
  }

  const currentStatementDate = getStatementDateForPurchase(
    transactionDate,
    debt.statementDayOfMonth,
    debt.statementDayPurchasesToNextCycle
  );
  const nextStatementDate = addMonthsClamped(currentStatementDate, 1);

  return {
    currentStatementDate,
    currentPaymentDate: getPaymentDateForStatement(currentStatementDate, debt.dueDayOfMonth),
    nextStatementDate,
    nextPaymentDate: getPaymentDateForStatement(nextStatementDate, debt.dueDayOfMonth)
  };
}

function getStatementDateForPurchase(
  transactionDate: Date,
  statementDayOfMonth: number,
  statementDayPurchasesToNextCycle: boolean
) {
  const statementThisMonth = createClampedDate(
    transactionDate.getFullYear(),
    transactionDate.getMonth(),
    statementDayOfMonth
  );
  statementThisMonth.setHours(23, 59, 59, 999);

  const normalizedTransactionDate = new Date(transactionDate);
  normalizedTransactionDate.setHours(12, 0, 0, 0);
  const sameDay =
    normalizedTransactionDate.getFullYear() === statementThisMonth.getFullYear() &&
    normalizedTransactionDate.getMonth() === statementThisMonth.getMonth() &&
    normalizedTransactionDate.getDate() === statementThisMonth.getDate();
  const beforeStatement =
    normalizedTransactionDate.getFullYear() < statementThisMonth.getFullYear() ||
    (normalizedTransactionDate.getFullYear() === statementThisMonth.getFullYear() &&
      normalizedTransactionDate.getMonth() < statementThisMonth.getMonth()) ||
    (normalizedTransactionDate.getFullYear() === statementThisMonth.getFullYear() &&
      normalizedTransactionDate.getMonth() === statementThisMonth.getMonth() &&
      normalizedTransactionDate.getDate() < statementThisMonth.getDate());

  if (sameDay) {
    return statementDayPurchasesToNextCycle
      ? addMonthsClamped(statementThisMonth, 1)
      : statementThisMonth;
  }

  if (beforeStatement) {
    return statementThisMonth;
  }

  return addMonthsClamped(statementThisMonth, 1);
}

function getPaymentDateForStatement(statementDate: Date, dueDayOfMonth: number) {
  const candidate = createClampedDate(statementDate.getFullYear(), statementDate.getMonth(), dueDayOfMonth);
  candidate.setHours(23, 59, 59, 999);

  if (candidate.getTime() > statementDate.getTime()) {
    return candidate;
  }

  return addMonthsClamped(candidate, 1);
}

function createClampedDate(year: number, month: number, day: number) {
  const lastDay = new Date(year, month + 1, 0).getDate();
  return new Date(year, month, Math.min(day, lastDay));
}

function addMonthsClamped(date: Date, months: number) {
  const shifted = createClampedDate(date.getFullYear(), date.getMonth() + months, date.getDate());
  shifted.setHours(23, 59, 59, 999);
  return shifted;
}
