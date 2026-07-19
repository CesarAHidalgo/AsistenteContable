/** Rutas amigables atendidas por `app/[section]/page.tsx`. */
export const dashboardTabs = [
  { id: "overview", label: "Resumen", href: "/resumen" },
  { id: "transactions", label: "Movimientos", href: "/movimientos" },
  { id: "recurring", label: "Recurrentes", href: "/recurrentes" },
  { id: "analysis", label: "Análisis", href: "/analisis" },
  { id: "debts", label: "Deudas", href: "/deudas" },
  { id: "cards", label: "Tarjetas", href: "/tarjetas" },
  { id: "simulation", label: "Simulación", href: "/simulacion" },
  { id: "reminders", label: "Recordatorios", href: "/recordatorios" }
] as const;

export type DashboardTabId = (typeof dashboardTabs)[number]["id"];
