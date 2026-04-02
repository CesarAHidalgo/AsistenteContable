export function AuthCard({
  kicker = "Acceso",
  title,
  description,
  children
}: {
  kicker?: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <article className="auth-card">
      <div className="panel-header">
        <div>
          <p className="section-kicker">{kicker}</p>
          <h2>{title}</h2>
        </div>
      </div>
      <p className="auth-copy">{description}</p>
      {children}
    </article>
  );
}
