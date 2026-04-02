import Link from "next/link";
import { LogoutButton } from "@/components/auth-client-controls";
import { ApiTokenForm, RevokeTokenForm } from "@/components/forms";
import { IdleSessionManager } from "@/components/idle-session-manager";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { SectionCard } from "@/components/section-card";
import {
  dispatchRemindersNowAction,
  sendTestEmailAction,
  verifySmtpAction
} from "@/app/actions";
import { requireUser } from "@/lib/auth";
import { getDashboardData } from "@/lib/data";
import { formatDate } from "@/lib/utils";

export default async function IntegracionesPage({
  searchParams
}: {
  searchParams: Promise<{ token?: string; message?: string; status?: string }>;
}) {
  const user = await requireUser();
  const data = await getDashboardData(user.id);
  const params = await searchParams;

  return (
    <main className="page-shell">
      <IdleSessionManager />
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
          {params.message ? (
            <div className={params.status === "warning" ? "error-banner" : "token-banner"}>{params.message}</div>
          ) : null}
        </SectionCard>
      </section>

      <section className="grid-layout single-column">
        <SectionCard kicker="Correo" title="Estado del canal de correo">
          <div className="detail-grid">
            <div>
              <span className="detail-label">Proveedor</span>
              <strong>{data.integrations.channelStatus.emailProvider}</strong>
            </div>
            <div>
              <span className="detail-label">Estado del canal</span>
              <strong>
                {data.integrations.channelStatus.emailConfigured ? "Lista" : "Pendiente"}
              </strong>
            </div>
            <div>
              <span className="detail-label">Correo de prueba</span>
              <strong>{user.email}</strong>
            </div>
          </div>
          <div className="hero-actions">
            <form action={verifySmtpAction}>
              <PendingSubmitButton
                className="ghost-button"
                idleLabel="Verificar conexión del correo"
                pendingLabel="Verificando conexión..."
              />
            </form>
            <form action={sendTestEmailAction}>
              <PendingSubmitButton
                idleLabel="Enviar correo de prueba"
                pendingLabel="Enviando correo..."
              />
            </form>
          </div>
        </SectionCard>

        <SectionCard kicker="Recordatorios" title="Ejecutar despacho ahora">
          <p className="empty-state">
            Este botón te permite probar el flujo real de recordatorios por correo sin esperar al cron.
          </p>
          <form action={dispatchRemindersNowAction}>
            <PendingSubmitButton
              idleLabel="Despachar recordatorios ahora"
              pendingLabel="Despachando recordatorios..."
            />
          </form>
        </SectionCard>

        <SectionCard kicker="Seguridad" title="Tokens activos">
          <div className="stack-list">
            {data.apiTokens.length === 0 ? (
              <p className="empty-state">Todavía no has generado tokens de integración.</p>
            ) : (
              data.apiTokens.map((token) => (
                <article key={token.id} className="item-card">
                  <header>
                    <div>
                      <h3>{token.name}</h3>
                      <p className="meta">Creado el {formatDate(token.createdAt.toISOString())}</p>
                      <p className="meta">
                        Último uso: {token.lastUsedAt ? formatDate(token.lastUsedAt.toISOString()) : "Sin uso aún"}
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

        <SectionCard kicker="Recordatorios" title="Despachador automático">
          <pre className="code-card">
{`POST /api/internal/reminders/dispatch
x-cron-secret: TU_CRON_SECRET`}
          </pre>
          <p className="empty-state">
            Este endpoint interno está pensado para que un cron o programador lo ejecute periódicamente y
            procese correo, push o WhatsApp según el tipo de recordatorio y su ventana de aviso.
          </p>
        </SectionCard>

        <SectionCard kicker="Canales" title="Configuración de notificaciones">
          <div className="detail-grid">
            <div>
              <span className="detail-label">Correo</span>
              <strong>{data.integrations.channelStatus.emailConfigured ? "Operativo" : "No configurado"}</strong>
            </div>
            <div>
              <span className="detail-label">Push</span>
              <strong>
                {data.integrations.channelStatus.pushSubscriptionCount} suscripción(es)
              </strong>
            </div>
            <div>
              <span className="detail-label">Web Push</span>
              <strong>{data.integrations.channelStatus.pushConfigured ? "Preparado" : "Sin VAPID"}</strong>
            </div>
            <div>
              <span className="detail-label">WhatsApp</span>
              <strong>{data.integrations.channelStatus.whatsappConfigured ? "Preparado" : "No configurado"}</strong>
            </div>
          </div>
        </SectionCard>

        <SectionCard kicker="Historial" title="Últimas entregas de recordatorios">
          <div className="stack-list">
            {data.integrations.recentReminderDeliveries.length === 0 ? (
              <p className="empty-state">Aún no hay entregas de recordatorios registradas.</p>
            ) : (
              data.integrations.recentReminderDeliveries.map((delivery) => (
                <article key={delivery.id} className="item-card">
                  <header>
                    <div>
                      <h3>{delivery.reminder.title}</h3>
                      <p className="meta">
                        {delivery.channel} · {delivery.status} · {formatDate(delivery.createdAt.toISOString())}
                      </p>
                      {delivery.message ? <p className="meta">{delivery.message}</p> : null}
                      {delivery.errorMessage ? <p className="meta negative-text">{delivery.errorMessage}</p> : null}
                    </div>
                  </header>
                </article>
              ))
            )}
          </div>
        </SectionCard>
      </section>
    </main>
  );
}
