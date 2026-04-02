export function SectionCard({
  kicker,
  title,
  children,
  wide = false,
  className = ""
}: {
  kicker: string;
  title: string;
  children: React.ReactNode;
  wide?: boolean;
  className?: string;
}) {
  return (
    <article className={`panel ${wide ? "panel-wide" : ""} ${className}`.trim()}>
      <div className="panel-header">
        <div>
          <p className="section-kicker">{kicker}</p>
          <h2>{title}</h2>
        </div>
      </div>
      {children}
    </article>
  );
}
