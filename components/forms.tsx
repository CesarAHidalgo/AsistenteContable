"use client";

import { useState } from "react";
import { DebtType, PaymentMethod, TransactionType } from "@prisma/client";
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
  "Honorarios",
  "Ventas",
  "Reembolso",
  "Vivienda",
  "Servicios",
  "Mercado",
  "Transporte",
  "Salud",
  "Educacion",
  "Entretenimiento",
  "Deudas",
  "Ahorro",
  "Otros"
];

export function TransactionForm() {
  const today = formatDateInput(new Date());

  return (
    <form action={createTransactionAction} className="form-grid">
      <label>
        Tipo
        <select name="type" defaultValue={"EXPENSE" as TransactionType}>
          {transactionTypeOptions().map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <label>
        Descripcion
        <input name="description" required />
      </label>
      <label>
        Valor
        <input name="amount" type="number" min="0" step="0.01" required />
      </label>
      <label>
        Categoria
        <input name="category" list="transaction-categories" required />
        <datalist id="transaction-categories">
          {categories.map((category) => (
            <option key={category} value={category} />
          ))}
        </datalist>
      </label>
      <label>
        Metodo de pago
        <select name="paymentMethod" defaultValue={"BANK_TRANSFER" as PaymentMethod}>
          {paymentMethodOptions().map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <label>
        Fecha
        <input name="transactionAt" type="date" defaultValue={today} required />
      </label>
      <button type="submit">Guardar movimiento</button>
    </form>
  );
}

export function DebtForm() {
  const [debtType, setDebtType] = useState<DebtType>("FIXED_INSTALLMENT");

  return (
    <form action={createDebtAction} className="form-grid">
      <label>
        Tipo de deuda
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
      </label>

      <label>
        Nombre del producto
        <input name="name" placeholder="Libre inversion Bancolombia" required />
      </label>

      <div className="form-section-title">Saldo base</div>
      <label>
        Valor inicial del credito
        <input name="initialAmount" type="number" min="0" step="0.01" required />
      </label>
      <label>
        Valor de deuda actual
        <input name="currentAmount" type="number" min="0" step="0.01" required />
      </label>
      <label>
        Tasa EA (%)
        <input name="annualEffectiveRate" type="number" min="0" step="0.0001" />
      </label>
      <label>
        Fecha de inicio del credito
        <input name="startedAt" type="date" defaultValue={formatDateInput(new Date())} />
      </label>

      <div className="form-section-title">Pago programado</div>
      <label>
        Cuota mensual esperada
        <input
          name="monthlyPayment"
          type="number"
          min="0"
          step="0.01"
          required={debtType === "FIXED_INSTALLMENT"}
        />
      </label>
      <label>
        Dia de pago
        <input name="dueDayOfMonth" type="number" min="1" max="31" />
      </label>

      {(debtType === "REVOLVING_CREDIT" || debtType === "CREDIT_CARD") ? (
        <>
          <div className="form-section-title">Control de cupo</div>
          <label>
            Cupo total
            <input name="creditLimit" type="number" min="0" step="0.01" />
          </label>
          <label>
            Porcentaje estimado de pago minimo
            <input name="minimumPaymentRate" type="number" min="0" step="0.001" />
          </label>
        </>
      ) : null}

      {debtType === "CREDIT_CARD" ? (
        <>
          <div className="form-section-title">Corte de tarjeta</div>
          <label>
            Dia de corte
            <input name="statementDayOfMonth" type="number" min="1" max="31" />
          </label>
        </>
      ) : null}

      <button type="submit">Crear deuda</button>
    </form>
  );
}

export function BillingCycleForm({
  billingCycleStartDay,
  billingCycleEndDay
}: {
  billingCycleStartDay: number;
  billingCycleEndDay: number;
}) {
  return (
    <form action={updateBillingCycleAction} className="form-grid compact-form">
      <label>
        Tu ciclo inicia el dia
        <input
          name="billingCycleStartDay"
          type="number"
          min="1"
          max="31"
          defaultValue={billingCycleStartDay}
          required
        />
      </label>
      <label>
        Tu ciclo termina el dia
        <input
          name="billingCycleEndDay"
          type="number"
          min="1"
          max="31"
          defaultValue={billingCycleEndDay}
          required
        />
      </label>
      <button type="submit">Actualizar ciclo</button>
    </form>
  );
}

export function ReminderForm() {
  return (
    <form action={createReminderAction} className="form-grid">
      <label>
        Titulo
        <input name="title" required />
      </label>
      <label>
        Valor estimado
        <input name="amount" type="number" min="0" step="0.01" />
      </label>
      <label>
        Fecha limite
        <input name="dueDate" type="date" defaultValue={formatDateInput(new Date())} required />
      </label>
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
      <label>
        Deuda
        <select name="debtId" required>
          {debts
            .filter((debt) => debt.currentAmount > 0)
            .map((debt) => (
              <option key={debt.id} value={debt.id}>
                {debt.name}
              </option>
            ))}
        </select>
      </label>
      <label>
        Valor pagado
        <input name="amount" type="number" min="0" step="0.01" required />
      </label>
      <label>
        Fecha
        <input name="paidAt" type="date" defaultValue={formatDateInput(new Date())} required />
      </label>
      <button type="submit">Aplicar pago</button>
    </form>
  );
}

export function ApiTokenForm() {
  return (
    <form action={createApiTokenAction} className="form-grid compact-form">
      <label>
        Nombre de la integracion
        <input name="name" placeholder="Shortcut iPhone" required />
      </label>
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
      <label>
        Nombre
        <input name="name" required />
      </label>
      <label>
        Correo
        <input name="email" type="email" required />
      </label>
      <label>
        Contrasena
        <input name="password" type="password" minLength={8} required />
      </label>
      <label>
        Confirmar contrasena
        <input name="confirmPassword" type="password" minLength={8} required />
      </label>
      <button type="submit">Crear cuenta</button>
    </form>
  );
}
