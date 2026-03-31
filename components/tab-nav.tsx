import type { Route } from "next";
import Link from "next/link";

type Tab = {
  id: string;
  label: string;
  href: Route;
};

export function TabNav({ tabs, activeTab }: { tabs: Tab[]; activeTab: string }) {
  return (
    <nav className="tab-nav" aria-label="Secciones del asistente">
      {tabs.map((tab) => (
        <Link
          key={tab.id}
          href={tab.href}
          className={`tab-link ${activeTab === tab.id ? "active" : ""}`}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
