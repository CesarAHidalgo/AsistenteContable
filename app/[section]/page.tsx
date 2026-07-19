import { notFound } from "next/navigation";
import Home, { type DashboardSearchParams } from "@/app/page";
import type { DashboardTabId } from "@/lib/dashboard-tabs";

const SECTION_TO_TAB: Record<string, DashboardTabId> = {
  resumen: "overview",
  movimientos: "transactions",
  recurrentes: "recurring",
  analisis: "analysis",
  deudas: "debts",
  tarjetas: "cards",
  simulacion: "simulation",
  recordatorios: "reminders"
};

export default async function DashboardSectionPage({
  params,
  searchParams
}: {
  params: Promise<{ section: string }>;
  searchParams?: Promise<DashboardSearchParams>;
}) {
  const { section } = await params;
  const activeTab = SECTION_TO_TAB[section];

  if (!activeTab) {
    notFound();
  }

  const resolvedSearchParams = searchParams ? await searchParams : {};

  return Home({
    searchParams: Promise.resolve({
      ...resolvedSearchParams,
      tab: activeTab
    })
  });
}
