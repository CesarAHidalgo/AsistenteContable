/** Alineado con `next.config.mjs` rewrites y `lib/dashboard-tabs.ts`. */
const TAB_TO_PATH: Record<string, string> = {
  overview: "/resumen",
  transactions: "/movimientos",
  analysis: "/analisis",
  debts: "/deudas",
  cards: "/tarjetas",
  simulation: "/simulacion",
  reminders: "/recordatorios"
};

export function dashboardUrlWithFeedback(
  tab: string,
  status: "success" | "warning" | "error",
  message: string
): string {
  const path = TAB_TO_PATH[tab];
  const q = new URLSearchParams();
  q.set("status", status);
  q.set("message", message);
  if (path) {
    return `${path}?${q.toString()}`;
  }
  q.set("tab", tab);
  return `/?${q.toString()}`;
}
