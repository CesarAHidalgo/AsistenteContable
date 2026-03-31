export const seedData = {
  transactions: [
    {
      id: "txn-1",
      description: "Pago nomina marzo",
      amount: 4200000,
      type: "INCOME" as const,
      category: "Nomina",
      paymentMethod: "BANK_TRANSFER" as const,
      transactionAt: "2026-03-25"
    },
    {
      id: "txn-2",
      description: "Mercado quincenal",
      amount: 380000,
      type: "EXPENSE" as const,
      category: "Mercado",
      paymentMethod: "DEBIT_CARD" as const,
      transactionAt: "2026-03-27"
    },
    {
      id: "txn-3",
      description: "Cuota tarjeta principal",
      amount: 650000,
      type: "EXPENSE" as const,
      category: "Deudas",
      paymentMethod: "BANK_TRANSFER" as const,
      transactionAt: "2026-03-28"
    }
  ],
  reminders: [
    {
      id: "rem-1",
      title: "Pago credito libre inversion",
      amount: 520000,
      dueDate: "2026-04-05"
    },
    {
      id: "rem-2",
      title: "Arriendo",
      amount: 1200000,
      dueDate: "2026-04-03"
    }
  ],
  debts: [
    {
      id: "debt-1",
      name: "Tarjeta principal",
      initialAmount: 6800000,
      currentAmount: 2450000,
      monthlyPayment: 650000
    },
    {
      id: "debt-2",
      name: "Prestamo libre inversion",
      initialAmount: 18500000,
      currentAmount: 13200000,
      monthlyPayment: 520000
    }
  ]
};
