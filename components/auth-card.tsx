export function AuthCard({
  title,
  description,
  children
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <article className="auth-card">
      <div className="panel-header">
        <div>
          <p className="section-kicker">Seguridad</p>
          <h2>{title}</h2>
        </div>
      </div>
      <p className="auth-copy">{description}</p>
      {children}
    </article>
  );
}
