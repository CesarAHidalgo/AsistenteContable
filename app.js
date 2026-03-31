const STORAGE_KEY = "asistente-contable-data-v1";

const CATEGORIES = {
  income: ["Nomina", "Honorarios", "Ventas", "Reembolso", "Otros ingresos"],
  expense: [
    "Vivienda",
    "Servicios",
    "Mercado",
    "Transporte",
    "Salud",
    "Educacion",
    "Entretenimiento",
    "Deudas",
    "Ahorro",
    "Otros gastos"
  ]
};

const state = loadState();

const elements = {
  transactionForm: document.getElementById("transaction-form"),
  reminderForm: document.getElementById("reminder-form"),
  debtForm: document.getElementById("debt-form"),
  debtPaymentForm: document.getElementById("debt-payment-form"),
  categorySelect: document.getElementById("category-select"),
  debtSelect: document.getElementById("debt-select"),
  netBalance: document.getElementById("net-balance"),
  incomeTotal: document.getElementById("income-total"),
  expenseTotal: document.getElementById("expense-total"),
  debtPendingTotal: document.getElementById("debt-pending-total"),
  alerts: document.getElementById("alerts"),
  transactionsList: document.getElementById("transactions-list"),
  debtsList: document.getElementById("debts-list"),
  remindersList: document.getElementById("reminders-list")
};

initialize();

function initialize() {
  setDefaultDates();
  bindEvents();
  updateCategoryOptions(elements.transactionForm.type.value);
  renderAll();
  registerServiceWorker();
}

function setDefaultDates() {
  const today = new Date().toISOString().slice(0, 10);
  elements.transactionForm.date.value = today;
  elements.debtPaymentForm.paymentDate.value = today;
  elements.reminderForm.dueDate.value = today;
}

function bindEvents() {
  elements.transactionForm.type.addEventListener("change", (event) => {
    updateCategoryOptions(event.target.value);
  });

  elements.transactionForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const transaction = {
      id: crypto.randomUUID(),
      type: formData.get("type"),
      description: formData.get("description").trim(),
      amount: Number(formData.get("amount")),
      category: formData.get("category"),
      paymentMethod: formData.get("paymentMethod"),
      date: formData.get("date")
    };

    state.transactions.unshift(transaction);
    persistAndRender();
    event.currentTarget.reset();
    setDefaultDates();
    updateCategoryOptions("income");
  });

  elements.reminderForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    state.reminders.push({
      id: crypto.randomUUID(),
      title: formData.get("title").trim(),
      dueDate: formData.get("dueDate"),
      amount: Number(formData.get("amount") || 0)
    });
    persistAndRender();
    event.currentTarget.reset();
    setDefaultDates();
  });

  elements.debtForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    state.debts.push({
      id: crypto.randomUUID(),
      name: formData.get("name").trim(),
      initialAmount: Number(formData.get("initialAmount")),
      currentAmount: Number(formData.get("initialAmount")),
      monthlyPayment: Number(formData.get("monthlyPayment") || 0),
      dueDate: formData.get("dueDate"),
      payments: []
    });
    persistAndRender();
    event.currentTarget.reset();
  });

  elements.debtPaymentForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const debtId = formData.get("debtId");
    const paymentAmount = Number(formData.get("paymentAmount"));
    const paymentDate = formData.get("paymentDate");
    const debt = state.debts.find((item) => item.id === debtId);

    if (!debt) {
      return;
    }

    debt.payments.push({
      id: crypto.randomUUID(),
      amount: paymentAmount,
      date: paymentDate
    });
    debt.currentAmount = Math.max(0, debt.currentAmount - paymentAmount);

    state.transactions.unshift({
      id: crypto.randomUUID(),
      type: "expense",
      description: `Abono a deuda: ${debt.name}`,
      amount: paymentAmount,
      category: "Deudas",
      paymentMethod: "transferencia",
      date: paymentDate
    });

    persistAndRender();
    event.currentTarget.reset();
    setDefaultDates();
  });
}

function updateCategoryOptions(type) {
  const categories = CATEGORIES[type];
  elements.categorySelect.innerHTML = categories
    .map((category) => `<option value="${category}">${category}</option>`)
    .join("");
}

function persistAndRender() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  renderAll();
}

function renderAll() {
  renderSummary();
  renderAlerts();
  renderTransactions();
  renderDebts();
  renderReminders();
  renderDebtOptions();
}

function renderSummary() {
  const currentMonthTransactions = getCurrentMonthTransactions();
  const income = sumByType(currentMonthTransactions, "income");
  const expenses = sumByType(currentMonthTransactions, "expense");
  const pendingDebt = state.debts.reduce((total, debt) => total + debt.currentAmount, 0);
  const net = income - expenses;

  elements.incomeTotal.textContent = formatCurrency(income);
  elements.expenseTotal.textContent = formatCurrency(expenses);
  elements.debtPendingTotal.textContent = formatCurrency(pendingDebt);
  elements.netBalance.textContent = formatCurrency(net);
}

function renderAlerts() {
  const currentMonthTransactions = getCurrentMonthTransactions();
  const income = sumByType(currentMonthTransactions, "income");
  const expenses = sumByType(currentMonthTransactions, "expense");
  const ratio = income > 0 ? expenses / income : 0;
  const dueSoon = state.reminders
    .filter((reminder) => daysUntil(reminder.dueDate) <= 5)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  const alerts = [];

  if (expenses > 0 && income === 0) {
    alerts.push({
      type: "warning",
      title: "Tienes gastos este mes sin ingresos registrados",
      body: "Registra tu nomina u otras entradas para tener una lectura real del mes."
    });
  }

  if (ratio >= 0.85) {
    alerts.push({
      type: "warning",
      title: "Tu gasto mensual ya supera el 85% de tus ingresos",
      body: "Conviene revisar compras variables, suscripciones o gastos no prioritarios."
    });
  } else if (income > 0) {
    alerts.push({
      type: "success",
      title: "Tu gasto esta bajo control",
      body: "Aun conservas margen frente a los ingresos registrados este mes."
    });
  }

  if (dueSoon.length > 0) {
    dueSoon.forEach((reminder) => {
      alerts.push({
        type: "warning",
        title: `Pago proximo: ${reminder.title}`,
        body: `Vence el ${formatDate(reminder.dueDate)} por ${formatCurrency(reminder.amount)}.`
      });
    });
  }

  elements.alerts.innerHTML = alerts
    .map(
      (alert) => `
        <article class="alert ${alert.type}">
          <strong>${alert.title}</strong>
          <p>${alert.body}</p>
        </article>
      `
    )
    .join("");
}

function renderTransactions() {
  if (state.transactions.length === 0) {
    elements.transactionsList.innerHTML = `<p class="empty-state">Aun no hay movimientos registrados.</p>`;
    return;
  }

  elements.transactionsList.innerHTML = state.transactions
    .slice(0, 12)
    .map(
      (transaction) => `
        <article class="list-item">
          <header>
            <div>
              <strong>${transaction.description}</strong>
              <div class="item-meta">${transaction.category} · ${humanizePaymentMethod(transaction.paymentMethod)} · ${formatDate(transaction.date)}</div>
            </div>
            <span class="pill ${transaction.type}">${formatCurrency(transaction.amount)}</span>
          </header>
        </article>
      `
    )
    .join("");
}

function renderDebts() {
  if (state.debts.length === 0) {
    elements.debtsList.innerHTML = `<p class="empty-state">Todavia no has agregado deudas o creditos.</p>`;
    return;
  }

  elements.debtsList.innerHTML = state.debts
    .slice()
    .sort((a, b) => a.currentAmount - b.currentAmount)
    .map((debt) => {
      const paid = debt.initialAmount - debt.currentAmount;
      const progress = debt.initialAmount > 0 ? (paid / debt.initialAmount) * 100 : 0;
      return `
        <article class="list-item">
          <header>
            <div>
              <strong>${debt.name}</strong>
              <div class="item-meta">Saldo pendiente: ${formatCurrency(debt.currentAmount)}</div>
              <div class="item-meta">Pago mensual esperado: ${formatCurrency(debt.monthlyPayment || 0)}</div>
            </div>
            <span class="pill ${debt.currentAmount === 0 ? "income" : "expense"}">${Math.round(progress)}%</span>
          </header>
          <div class="debt-progress">
            <span style="width: ${Math.min(progress, 100)}%"></span>
          </div>
        </article>
      `;
    })
    .join("");
}

function renderReminders() {
  if (state.reminders.length === 0) {
    elements.remindersList.innerHTML = `<p class="empty-state">No hay recordatorios creados.</p>`;
    return;
  }

  elements.remindersList.innerHTML = state.reminders
    .slice()
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    .map(
      (reminder) => `
        <article class="list-item">
          <header>
            <div>
              <strong>${reminder.title}</strong>
              <div class="item-meta">Vence el ${formatDate(reminder.dueDate)}</div>
            </div>
            <span class="pill expense">${formatCurrency(reminder.amount)}</span>
          </header>
        </article>
      `
    )
    .join("");
}

function renderDebtOptions() {
  if (state.debts.length === 0) {
    elements.debtSelect.innerHTML = `<option value="">No hay deudas registradas</option>`;
    return;
  }

  const activeDebts = state.debts.filter((debt) => debt.currentAmount > 0);

  if (activeDebts.length === 0) {
    elements.debtSelect.innerHTML = `<option value="">No hay deudas pendientes</option>`;
    return;
  }

  elements.debtSelect.innerHTML = activeDebts
    .map((debt) => `<option value="${debt.id}">${debt.name}</option>`)
    .join("");
}

function getCurrentMonthTransactions() {
  const now = new Date();
  const month = now.getMonth();
  const year = now.getFullYear();

  return state.transactions.filter((transaction) => {
    const date = new Date(`${transaction.date}T00:00:00`);
    return date.getMonth() === month && date.getFullYear() === year;
  });
}

function sumByType(transactions, type) {
  return transactions
    .filter((transaction) => transaction.type === type)
    .reduce((total, transaction) => total + transaction.amount, 0);
}

function daysUntil(dateString) {
  const today = new Date();
  const targetDate = new Date(`${dateString}T00:00:00`);
  const diff = targetDate - new Date(today.toDateString());
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function loadState() {
  const fallback = {
    transactions: [],
    debts: [],
    reminders: []
  };

  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return saved ? { ...fallback, ...saved } : fallback;
  } catch {
    return fallback;
  }
}

function formatCurrency(value) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0
  }).format(value || 0);
}

function formatDate(value) {
  if (!value) {
    return "Sin fecha";
  }

  return new Intl.DateTimeFormat("es-CO", {
    year: "numeric",
    month: "short",
    day: "numeric"
  }).format(new Date(`${value}T00:00:00`));
}

function humanizePaymentMethod(value) {
  const labels = {
    transferencia: "Transferencia",
    "tarjeta-credito": "Tarjeta credito",
    "tarjeta-debito": "Tarjeta debito",
    efectivo: "Efectivo",
    nequi: "Nequi",
    daviplata: "Daviplata",
    otro: "Otro"
  };

  return labels[value] || value;
}

function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("service-worker.js").catch(() => {
      return null;
    });
  }
}
