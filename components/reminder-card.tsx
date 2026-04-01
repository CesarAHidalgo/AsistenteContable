import {
  deleteReminderAction,
  toggleReminderCompletionAction,
  updateReminderAction
} from "@/app/actions";
import { formatDateInput } from "@/lib/serializers";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";

type Reminder = {
  id: string;
  title: string;
  type: "PAYMENT" | "ALARM";
  amount: number | null;
  dueDate: string | Date;
  notificationAt: string | Date | null;
  notifyDaysBefore: number;
  notifyEmail: boolean;
  notifyPush: boolean;
  notifyWhatsApp: boolean;
  isCompleted: boolean;
  completedAt: string | Date | null;
  paymentRecordedAt: string | Date | null;
  lastNotifiedAt: string | Date | null;
};

export function ReminderCard({ reminder }: { reminder: Reminder }) {
  const isPayment = reminder.type === "PAYMENT";

  return (
    <article className={`item-card reminder-card ${reminder.isCompleted ? "is-completed" : ""}`}>
      <header>
        <div>
          <div className="tag-row">
            <span className="chip neutral">{isPayment ? "Pago" : "Alarma"}</span>
            <span className={`chip ${reminder.isCompleted ? "neutral" : "warning"}`}>
              {reminder.isCompleted ? "Completado" : "Pendiente"}
            </span>
            {reminder.notifyEmail ? <span className="chip neutral">Correo</span> : null}
            {reminder.notifyPush ? <span className="chip neutral">Push</span> : null}
            {reminder.notifyWhatsApp ? <span className="chip neutral">WhatsApp</span> : null}
          </div>
          <h3>{reminder.title}</h3>
          <p className="meta">
            {isPayment
              ? `Fecha de pago: ${formatDate(reminder.dueDate)}`
              : `Alarma programada: ${formatDateTime(reminder.notificationAt ?? reminder.dueDate)}`}
          </p>
          {isPayment ? (
            <p className="meta">Empieza a avisar {reminder.notifyDaysBefore} dia(s) antes.</p>
          ) : null}
          {reminder.paymentRecordedAt ? (
            <p className="meta">Pago registrado el {formatDateTime(reminder.paymentRecordedAt)}</p>
          ) : null}
          {reminder.completedAt ? (
            <p className="meta">Completado el {formatDateTime(reminder.completedAt)}</p>
          ) : null}
          {reminder.lastNotifiedAt ? (
            <p className="meta">Ultimo intento de notificacion: {formatDateTime(reminder.lastNotifiedAt)}</p>
          ) : null}
        </div>
        <span className="chip warning">{formatCurrency(reminder.amount ?? 0)}</span>
      </header>

      <div className="reminder-actions">
        <form action={toggleReminderCompletionAction}>
          <input type="hidden" name="reminderId" value={reminder.id} />
          <input type="hidden" name="nextState" value={String(!reminder.isCompleted)} />
          <button type="submit" className="ghost-button">
            {reminder.isCompleted ? "Marcar pendiente" : isPayment ? "Registrar pago" : "Marcar completado"}
          </button>
        </form>

        <details className="inline-editor">
          <summary>Editar</summary>
          <form action={updateReminderAction} className="form-grid compact-form inline-form">
            <input type="hidden" name="reminderId" value={reminder.id} />

            <label>
              <span>Tipo</span>
              <select name="type" defaultValue={reminder.type}>
                <option value="PAYMENT">Pago</option>
                <option value="ALARM">Alarma</option>
              </select>
            </label>

            <label>
              <span>Titulo</span>
              <input name="title" defaultValue={reminder.title} required />
            </label>

            <label>
              <span>Valor estimado</span>
              <input
                name="amount"
                type="number"
                min="0"
                step="0.01"
                defaultValue={reminder.amount ?? ""}
              />
            </label>

            <label>
              <span>Fecha base</span>
              <input
                name="dueDate"
                type="date"
                defaultValue={formatDateInput(new Date(reminder.dueDate))}
                required
              />
            </label>

            <label>
              <span>Fecha y hora de alarma</span>
              <input
                name="notificationAt"
                type="datetime-local"
                defaultValue={toDateTimeLocalValue(reminder.notificationAt ?? reminder.dueDate)}
              />
            </label>

            <label>
              <span>Dias previos para avisar</span>
              <input
                name="notifyDaysBefore"
                type="number"
                min="1"
                max="30"
                step="1"
                defaultValue={Math.max(reminder.notifyDaysBefore || 5, 1)}
              />
            </label>

            <label className="checkbox-row">
              <input name="notifyEmail" type="checkbox" defaultChecked={reminder.notifyEmail} />
              <span>Notificar por correo</span>
            </label>

            <label className="checkbox-row">
              <input name="notifyPush" type="checkbox" defaultChecked={reminder.notifyPush} />
              <span>Notificar por push</span>
            </label>

            <label className="checkbox-row">
              <input name="notifyWhatsApp" type="checkbox" defaultChecked={reminder.notifyWhatsApp} />
              <span>Notificar por WhatsApp</span>
            </label>

            <button type="submit">Guardar cambios</button>
          </form>
        </details>

        <details className="inline-editor">
          <summary>Eliminar</summary>
          <form action={deleteReminderAction} className="form-grid compact-form inline-form">
            <input type="hidden" name="reminderId" value={reminder.id} />
            <p className="meta">
              Esto elimina el recordatorio de forma permanente.
            </p>
            <button type="submit" className="ghost-button destructive-button">
              Confirmar eliminacion
            </button>
          </form>
        </details>
      </div>
    </article>
  );
}

function toDateTimeLocalValue(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);
  const offset = date.getTimezoneOffset();
  const normalized = new Date(date.getTime() - offset * 60_000);
  return normalized.toISOString().slice(0, 16);
}
