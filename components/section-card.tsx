export function SectionCard({
  kicker,
  title,
  children,
  wide = false,
  className = "",
  icon,
  subtitle,
  id
}: {
  kicker: string;
  title: string;
  children: React.ReactNode;
  wide?: boolean;
  className?: string;
  icon?: string;
  subtitle?: string;
  id?: string;
}) {
  return (
    <article id={id} className={`panel ${wide ? "panel-wide" : ""} ${className}`.trim()}>
      <div className="panel-header">
        <div>
          <p className="section-kicker">
            {icon ? <span className="section-icon" aria-hidden="true">{icon}</span> : null}
            {kicker}
          </p>
          <h2>{title}</h2>
          {subtitle ? <p className="panel-subtitle">{subtitle}</p> : null}
        </div>
      </div>
      {children}
    </article>
  );
}
