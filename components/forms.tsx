import { PaymentMethod, TransactionType } from "@prisma/client";
import {
  createApiTokenAction,
  createDebtAction,
  createDebtPaymentAction,
  createReminderAction,
  createTransactionAction,
  registerAction,
  revokeApiTokenAction
} from "@/app/actions";
import { formatDateInput, paymentMethodOptions, transactionTypeOptions } from "@/lib/serializers";

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
  return (
    <form action={createDebtAction} className="form-grid">
      <label>
        Nombre de la deuda
        <input name="name" required />
      </label>
      <label>
        Saldo inicial
        <input name="initialAmount" type="number" min="0" step="0.01" required />
      </label>
      <label>
        Pago mensual esperado
        <input name="monthlyPayment" type="number" min="0" step="0.01" />
      </label>
      <label>
        Dia del mes
        <input name="dueDayOfMonth" type="number" min="1" max="31" />
      </label>
      <button type="submit">Crear deuda</button>
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
        Valor del abono
        <input name="amount" type="number" min="0" step="0.01" required />
      </label>
      <label>
        Fecha
        <input name="paidAt" type="date" defaultValue={formatDateInput(new Date())} required />
      </label>
      <button type="submit">Aplicar abono</button>
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
