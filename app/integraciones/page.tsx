import Link from "next/link";
import { LogoutButton } from "@/components/auth-client-controls";
import { ApiTokenForm, RevokeTokenForm } from "@/components/forms";
import { SectionCard } from "@/components/section-card";
import { requireUser } from "@/lib/auth";
import { getDashboardData } from "@/lib/data";
import { formatDate } from "@/lib/utils";

export default async function IntegracionesPage({
  searchParams
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const user = await requireUser();
  const data = await getDashboardData(user.id);
  const params = await searchParams;

  return (
    <main className="page-shell">
      <section className="hero compact-hero">
        <div className="hero-copy">
          <p className="eyebrow">Integraciones</p>
          <h1>Conecta tu panel con iPhone, webhooks y automatizaciones personales.</h1>
          <p>
            Crea tokens personales para consumir la API desde clientes que controles. Cada token se puede revocar cuando quieras.
          </p>
          <div className="hero-actions">
            <Link href="/" className="inline-link">
              Volver al dashboard
            </Link>
            <LogoutButton />
          </div>
        </div>

        <SectionCard kicker="API" title="Generar token">
          <ApiTokenForm />
          {params.token ? (
            <div className="token-banner">
              <strong>Guarda este token ahora:</strong>
              <code>{params.token}</code>
            </div>
          ) : null}
        </SectionCard>
      </section>

      <section className="grid-layout single-column">
        <SectionCard kicker="Seguridad" title="Tokens activos">
          <div className="stack-list">
            {data.apiTokens.length === 0 ? (
              <p className="empty-state">Todavia no has generado tokens de integracion.</p>
            ) : (
              data.apiTokens.map((token) => (
                <article key={token.id} className="item-card">
                  <header>
                    <div>
                      <h3>{token.name}</h3>
                      <p className="meta">Creado el {formatDate(token.createdAt.toISOString())}</p>
                      <p className="meta">
                        Ultimo uso: {token.lastUsedAt ? formatDate(token.lastUsedAt.toISOString()) : "Sin uso aun"}
                      </p>
                    </div>
                    <RevokeTokenForm tokenId={token.id} />
                  </header>
                </article>
              ))
            )}
          </div>
        </SectionCard>

        <SectionCard kicker="Ejemplo" title="Payload para Atajos de iPhone">
          <pre className="code-card">
{`POST /api/v1/transactions
Authorization: Bearer TU_TOKEN
Content-Type: application/json

{
  "description": "Pago almuerzo",
  "amount": 24000,
  "type": "EXPENSE",
  "category": "Mercado",
  "paymentMethod": "NEQUI",
  "transactionAt": "2026-03-30"
}`}
          </pre>
        </SectionCard>
      </section>
    </main>
  );
}
