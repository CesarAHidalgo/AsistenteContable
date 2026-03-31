import { formatCurrency, formatDate } from "@/lib/utils";

type Reminder = {
  id: string;
  title: string;
  amount: number;
  dueDate: string;
};

export function ReminderCard({ reminder }: { reminder: Reminder }) {
  return (
    <article className="item-card">
      <header>
        <div>
          <h3>{reminder.title}</h3>
          <p className="meta">Vence el {formatDate(reminder.dueDate)}</p>
        </div>
        <span className="chip warning">{formatCurrency(reminder.amount)}</span>
      </header>
    </article>
  );
}
