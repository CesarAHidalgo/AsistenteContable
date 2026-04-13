export function TransactionsSectionNav() {
  const links = [
    { href: "#tx-nuevo", label: "Nuevo" },
    { href: "#tx-historial", label: "Historial" },
    { href: "#tx-csv", label: "CSV" },
    { href: "#tx-recurrentes", label: "Recurrentes" }
  ] as const;

  return (
    <nav className="tx-section-nav" aria-label="Ir a un bloque en Movimientos">
      {links.map((item) => (
        <a key={item.href} href={item.href} className="tx-section-nav-link">
          {item.label}
        </a>
      ))}
    </nav>
  );
}
