"use client";

import { useState } from "react";
import { DebtType, PaymentMethod, ReminderType, TransactionType } from "@prisma/client";
import {
  createApiTokenAction,
  createDebtAction,
  createDebtPaymentAction,
  createReminderAction,
  createTransactionAction,
  registerAction,
  revokeApiTokenAction,
  updateBillingCycleAction
} from "@/app/actions";
import {
  debtTypeOptions,
  formatDateInput,
  paymentMethodOptions,
  transactionTypeOptions
} from "@/lib/serializers";

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

export function TransactionForm() {
  const today = formatDateInput(new Date());
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("BANK_TRANSFER");

  return (
    <form action={createTransactionAction} className="form-grid">
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
        <input name="category" list="transaction-categories" required />
        <datalist id="transaction-categories">
          {categories.map((category) => (
            <option key={category} value={category} />
          ))}
        </datalist>
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
        <FieldLabel label="Numero de cuotas" required help="Solo para compras hechas con tarjeta de credito.">
          <input name="installmentCount" type="number" min="1" step="1" defaultValue="1" required />
        </FieldLabel>
      ) : null}

      <FieldLabel label="Fecha" required>
        <input name="transactionAt" type="date" defaultValue={today} required />
      </FieldLabel>

      <button type="submit">Guardar movimiento</button>
    </form>
  );
}

export function DebtForm() {
  const [debtType, setDebtType] = useState<DebtType>("FIXED_INSTALLMENT");
  const isFixed = debtType === "FIXED_INSTALLMENT";
  const isRevolving = debtType === "REVOLVING_CREDIT";
  const isCreditCard = debtType === "CREDIT_CARD";
  const initialAmountLabel = isCreditCard ? "Saldo inicial a controlar" : "Valor inicial del credito";
  const currentAmountLabel = isCreditCard ? "Saldo actual de la tarjeta" : "Valor de deuda actual";
  const initialAmountHelp = isCreditCard
    ? "Si empiezas a llevar control desde hoy, puedes poner el mismo valor del saldo actual."
    : "Valor con el que nacio la deuda o el saldo que quieres tomar como punto de partida.";

  return (
    <form action={createDebtAction} className="form-grid">
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
        label="Cuota mensual esperada"
        required={isFixed}
        optional={!isFixed}
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

          <FieldLabel label="Valor real del pago minimo" required>
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

      <button type="submit">Crear deuda</button>
    </form>
  );
}

export function BillingCycleForm({
  billingCycleReferenceStart,
  billingCycleReferenceEnd
}: {
  billingCycleReferenceStart: string;
  billingCycleReferenceEnd: string;
}) {
  return (
    <form action={updateBillingCycleAction} className="form-grid compact-form">
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

      <button type="submit">Actualizar ciclo</button>
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
  debts
}: {
  debts: Array<{ id: string; name: string; currentAmount: number }>;
}) {
  return (
    <form action={createDebtPaymentAction} className="form-grid">
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

      <button type="submit">Aplicar pago</button>
    </form>
  );
}

export function ApiTokenForm() {
  return (
    <form action={createApiTokenAction} className="form-grid compact-form">
      <FormLegend />

      <FieldLabel label="Nombre de la integracion" required>
        <input name="name" placeholder="Shortcut iPhone" required />
      </FieldLabel>

      <button type="submit">Generar token</button>
    </form>
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

      <FieldLabel label="Contrasena" required>
        <input name="password" type="password" minLength={8} required />
      </FieldLabel>

      <FieldLabel label="Confirmar contrasena" required>
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
