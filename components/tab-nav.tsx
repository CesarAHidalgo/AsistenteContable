"use client";

import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";

export type DashboardTabItem = {
  id: string;
  label: string;
  href: string;
};

export function TabNav({ tabs, activeTab }: { tabs: readonly DashboardTabItem[]; activeTab: string }) {
  const router = useRouter();

  return (
    <>
      <nav className="tab-nav tab-nav-desktop" aria-label="Secciones del asistente">
        {tabs.map((tab) => (
          <Link
            key={tab.id}
            href={tab.href as Route}
            prefetch={false}
            className={`tab-link ${activeTab === tab.id ? "active" : ""}`}
            aria-current={activeTab === tab.id ? "page" : undefined}
          >
            {tab.label}
          </Link>
        ))}
      </nav>

      <div className="tab-nav-mobile-wrap">
        <label htmlFor="dashboard-section-select" className="visually-hidden">
          Ir a sección
        </label>
        <select
          id="dashboard-section-select"
          className="tab-nav-select"
          value={activeTab}
          onChange={(event) => {
            const next = tabs.find((t) => t.id === event.target.value);
            if (next) {
              router.push(next.href as Route);
            }
          }}
        >
          {tabs.map((tab) => (
            <option key={tab.id} value={tab.id}>
              {tab.label}
            </option>
          ))}
        </select>
      </div>
    </>
  );
}

export function DashboardSecondaryNav() {
  return (
    <nav className="app-secondary-toolbar" aria-label="Accesos rápidos">
      <Link href={"/integraciones" as Route} className="inline-link" prefetch={false}>
        Integraciones
      </Link>
      <span className="app-secondary-toolbar-meta">API, correo y recordatorios</span>
    </nav>
  );
}
