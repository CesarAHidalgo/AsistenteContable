import {
  ReminderDeliveryChannel,
  ReminderDeliveryStatus,
  ReminderType
} from "@prisma/client";
import nodemailer from "nodemailer";
import { Resend } from "resend";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";

type ReminderWithUser = Awaited<ReturnType<typeof loadActiveReminders>>[number];

function startOfDay(value: Date) {
  const next = new Date(value);
  next.setHours(0, 0, 0, 0);
  return next;
}

function endOfDay(value: Date) {
  const next = new Date(value);
  next.setHours(23, 59, 59, 999);
  return next;
}

function addDays(value: Date, days: number) {
  const next = new Date(value);
  next.setDate(next.getDate() + days);
  return next;
}

function parseBooleanEnv(value: string | undefined) {
  return value === "true";
}

function smtpConfig() {
  const host = process.env.SMTP_HOST?.trim();
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();
  const from = process.env.SMTP_FROM?.trim();

  if (!host || !user || !pass || !from) {
    return null;
  }

  return {
    host,
    port,
    secure: parseBooleanEnv(process.env.SMTP_SECURE),
    auth: {
      user,
      pass
    },
    from
  };
}

function resendConfig() {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from =
    process.env.EMAIL_FROM?.trim() ||
    process.env.RESEND_FROM?.trim() ||
    process.env.SMTP_FROM?.trim();

  if (!apiKey || !from) {
    return null;
  }

  return {
    apiKey,
    from
  };
}

function createTransporter() {
  const config = smtpConfig();

  if (!config) {
    return null;
  }

  return {
    transporter: nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: config.auth
    }),
    from: config.from
  };
}

function whatsappConfig() {
  const token = process.env.WHATSAPP_ACCESS_TOKEN?.trim();
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim();
  const to = process.env.WHATSAPP_TO?.trim();

  if (!token || !phoneNumberId || !to) {
    return null;
  }

  return { token, phoneNumberId, to };
}

function pushConfig() {
  const publicKey = process.env.WEB_PUSH_PUBLIC_KEY?.trim();
  const privateKey = process.env.WEB_PUSH_PRIVATE_KEY?.trim();
  const subject = process.env.WEB_PUSH_SUBJECT?.trim();

  if (!publicKey || !privateKey || !subject) {
    return null;
  }

  return { publicKey, privateKey, subject };
}

function buildReminderMessage(reminder: ReminderWithUser) {
  const lines = [
    "AsistenteContable",
    reminder.type === ReminderType.PAYMENT ? `Pago pendiente: ${reminder.title}` : `Alarma: ${reminder.title}`,
    reminder.type === ReminderType.PAYMENT
      ? `Fecha de pago: ${formatDate(reminder.dueDate)}`
      : `Momento de la alarma: ${formatDateTime(reminder.notificationAt ?? reminder.dueDate)}`,
    reminder.amount ? `Valor estimado: ${formatCurrency(reminder.amount.toNumber())}` : null
  ];

  return lines.filter(Boolean).join("\n");
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function buildEmailShell({
  eyebrow,
  title,
  accent,
  accentSoft,
  icon,
  body,
  details,
  footer,
  actionLabel,
  actionUrl
}: {
  eyebrow: string;
  title: string;
  accent: string;
  accentSoft: string;
  icon: string;
  body: string;
  details: Array<{ label: string; value: string }>;
  footer: string;
  actionLabel?: string;
  actionUrl?: string;
}) {
  const detailsHtml = details
    .map(
      (detail) => `
        <tr>
          <td style="padding: 0 0 10px; color: #5f6f87; font-size: 13px; width: 150px;">${escapeHtml(detail.label)}</td>
          <td style="padding: 0 0 10px; color: #10233d; font-size: 14px; font-weight: 600;">${escapeHtml(detail.value)}</td>
        </tr>
      `
    )
    .join("");
  const actionHtml =
    actionLabel && actionUrl
      ? `
        <div style="margin: 0 0 22px;">
          <a
            href="${escapeHtml(actionUrl)}"
            style="display: inline-block; padding: 13px 18px; border-radius: 999px; background: ${accent}; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 700;"
          >
            ${escapeHtml(actionLabel)}
          </a>
        </div>
      `
      : "";

  return `
    <!doctype html>
    <html lang="es">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${escapeHtml(title)}</title>
      </head>
      <body style="margin: 0; padding: 24px; background: #f4f7fb; font-family: Arial, Helvetica, sans-serif; color: #10233d;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 640px; margin: 0 auto;">
          <tr>
            <td>
              <div style="background: #ffffff; border: 1px solid #dbe5f0; border-radius: 24px; overflow: hidden;">
                <div style="padding: 28px 32px; background: linear-gradient(135deg, ${accent} 0%, #10233d 100%); color: #ffffff;">
                  <div style="display: inline-flex; align-items: center; justify-content: center; width: 46px; height: 46px; border-radius: 50%; background: rgba(255, 255, 255, 0.18); font-size: 24px; margin-bottom: 18px;">
                    ${escapeHtml(icon)}
                  </div>
                  <p style="margin: 0 0 10px; font-size: 12px; letter-spacing: 0.18em; text-transform: uppercase; opacity: 0.88;">
                    ${escapeHtml(eyebrow)}
                  </p>
                  <h1 style="margin: 0; font-size: 28px; line-height: 1.2;">
                    ${escapeHtml(title)}
                  </h1>
                </div>

                <div style="padding: 28px 32px;">
                  <p style="margin: 0 0 20px; font-size: 15px; line-height: 1.7; color: #334862;">
                    ${escapeHtml(body)}
                  </p>

                  <div style="padding: 18px 20px; border: 1px solid #dbe5f0; border-radius: 18px; background: ${accentSoft}; margin-bottom: 20px;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                      ${detailsHtml}
                    </table>
                  </div>

                  ${actionHtml}

                  <p style="margin: 0; font-size: 13px; line-height: 1.6; color: #6c7d96;">
                    ${escapeHtml(footer)}
                  </p>
                </div>
              </div>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
}

function buildReminderHtml(reminder: ReminderWithUser) {
  const isPayment = reminder.type === ReminderType.PAYMENT;
  const dashboardUrl = process.env.NEXTAUTH_URL?.trim() || undefined;

  return buildEmailShell({
    eyebrow: "Asistente Contable",
    title: isPayment ? `Pago pendiente: ${reminder.title}` : `Alarma: ${reminder.title}`,
    accent: isPayment ? "#1f8a8a" : "#2b6cb0",
    accentSoft: isPayment ? "#eef9f8" : "#eef5ff",
    icon: isPayment ? "COP" : "AL",
    body: isPayment
      ? "Te recordamos que este pago está dentro de tu ventana de aviso configurada. Si ya lo realizaste, márcalo como completado para detener futuras notificaciones."
      : "Esta es una alarma programada desde tu panel para que no se te pase una actividad importante.",
    details: [
      {
        label: isPayment ? "Fecha de pago" : "Momento de la alarma",
        value: isPayment
          ? formatDate(reminder.dueDate)
          : formatDateTime(reminder.notificationAt ?? reminder.dueDate)
      },
      ...(reminder.amount
        ? [
            {
              label: "Valor estimado",
              value: formatCurrency(reminder.amount.toNumber())
            }
          ]
        : []),
      {
        label: "Canal",
        value: "Correo electrónico"
      }
    ],
    footer:
      "Puedes revisar este recordatorio desde AsistenteContable y marcarlo como completado cuando corresponda.",
    actionLabel: "Abrir Asistente Contable",
    actionUrl: dashboardUrl
  });
}

function buildTestEmailHtml(sentAt: Date) {
  const dashboardUrl = process.env.NEXTAUTH_URL?.trim() || undefined;

  return buildEmailShell({
    eyebrow: "Asistente Contable",
    title: "Prueba del canal de correo",
    accent: "#2f9e7d",
    accentSoft: "#eef9f4",
    icon: "OK",
    body: "Este mensaje confirma que el canal de correo está configurado correctamente y puede enviar notificaciones desde la aplicación.",
    details: [
      {
        label: "Proveedor",
        value: "Correo configurado en Integraciones"
      },
      {
        label: "Fecha de prueba",
        value: formatDateTime(sentAt)
      }
    ],
    footer:
      "Si recibiste este correo, ya puedes usar recordatorios por email desde tu entorno actual.",
    actionLabel: "Ir al panel",
    actionUrl: dashboardUrl
  });
}

async function sendEmail(reminder: ReminderWithUser) {
  const resend = resendConfig();
  const subject =
    reminder.type === ReminderType.PAYMENT ? `Pago pendiente: ${reminder.title}` : `Alarma: ${reminder.title}`;
  const text = buildReminderMessage(reminder);
  const html = buildReminderHtml(reminder);

  if (resend) {
    const client = new Resend(resend.apiKey);
    await client.emails.send({
      from: resend.from,
      to: reminder.user.email,
      subject,
      text,
      html
    });

    return {
      status: ReminderDeliveryStatus.SENT,
      message: `Correo enviado a ${reminder.user.email} con Resend`
    };
  }

  const transport = createTransporter();

  if (!transport) {
    return {
      status: ReminderDeliveryStatus.SKIPPED,
      message: "SMTP no configurado"
    };
  }

  await transport.transporter.sendMail({
    from: transport.from,
    to: reminder.user.email,
    subject,
    text,
    html
  });

  return {
    status: ReminderDeliveryStatus.SENT,
    message: `Correo enviado a ${reminder.user.email}`
  };
}

export function getNotificationChannelStatus(pushSubscriptionCount = 0) {
  const resend = resendConfig();
  const smtp = smtpConfig();

  return {
    emailConfigured: Boolean(resend || smtp),
    emailProvider: resend ? "Resend API" : smtp ? "SMTP" : "Sin configurar",
    pushConfigured: Boolean(pushConfig()),
    whatsappConfigured: Boolean(whatsappConfig()),
    pushSubscriptionCount
  };
}

export async function verifySmtpConnection() {
  const resend = resendConfig();

  if (resend) {
    return {
      ok: true,
      message: `Resend API configurada correctamente con remitente ${resend.from}`
    };
  }

  const transport = createTransporter();

  if (!transport) {
    return {
      ok: false,
      message: "SMTP no configurado"
    };
  }

  await transport.transporter.verify();

  return {
    ok: true,
    message: "Conexión SMTP verificada correctamente"
  };
}

export async function sendTestEmail(targetEmail: string) {
  const resend = resendConfig();
  const sentAt = new Date();
  const text = [
    "AsistenteContable",
    "",
    resend ? "Esta es una prueba del canal de correo con Resend." : "Esta es una prueba del canal de correo.",
    `Fecha: ${formatDateTime(sentAt)}`
  ].join("\n");
  const html = buildTestEmailHtml(sentAt);

  if (resend) {
    const client = new Resend(resend.apiKey);
    await client.emails.send({
      from: resend.from,
      to: targetEmail,
      subject: "Prueba de correo de AsistenteContable",
      text,
      html
    });

    return {
      ok: true,
      message: `Correo de prueba enviado a ${targetEmail} usando Resend`
    };
  }

  const transport = createTransporter();

  if (!transport) {
    return {
      ok: false,
      message: "SMTP no configurado"
    };
  }

  await transport.transporter.sendMail({
    from: transport.from,
    to: targetEmail,
    subject: "Prueba de correo de AsistenteContable",
    text,
    html
  });

  return {
    ok: true,
    message: `Correo de prueba enviado a ${targetEmail}`
  };
}

async function sendWhatsApp(reminder: ReminderWithUser) {
  const config = whatsappConfig();

  if (!config) {
    return {
      status: ReminderDeliveryStatus.SKIPPED,
      message: "WhatsApp no configurado"
    };
  }

  const response = await fetch(`https://graph.facebook.com/v22.0/${config.phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: config.to,
      type: "text",
      text: {
        body: buildReminderMessage(reminder)
      }
    }),
    cache: "no-store"
  });

  if (!response.ok) {
    const errorMessage = await response.text();
    throw new Error(errorMessage || "No se pudo enviar WhatsApp");
  }

  return {
    status: ReminderDeliveryStatus.SENT,
    message: `WhatsApp enviado a ${config.to}`
  };
}

async function sendPush(reminder: ReminderWithUser) {
  const config = pushConfig();

  if (!config) {
    return {
      status: ReminderDeliveryStatus.SKIPPED,
      message: "Web Push no configurado"
    };
  }

  const subscriptionCount = await prisma.pushSubscription.count({
    where: { userId: reminder.userId }
  });

  if (subscriptionCount === 0) {
    return {
      status: ReminderDeliveryStatus.SKIPPED,
      message: "No hay suscripciones push registradas"
    };
  }

  return {
    status: ReminderDeliveryStatus.SKIPPED,
    message: "Push preparado. Falta habilitar el envio con VAPID y el cliente suscrito."
  };
}

function isWithinPaymentWindow(reminder: ReminderWithUser, now: Date) {
  const dueDayStart = startOfDay(reminder.dueDate);
  const notificationStart = startOfDay(addDays(dueDayStart, -(reminder.notifyDaysBefore || 5)));
  const currentDay = startOfDay(now);
  return currentDay >= notificationStart && currentDay < dueDayStart;
}

function isAlarmDue(reminder: ReminderWithUser, now: Date) {
  if (!reminder.notificationAt) {
    return false;
  }

  return reminder.notificationAt <= now;
}

function getScheduledFor(reminder: ReminderWithUser, now: Date) {
  if (reminder.type === ReminderType.ALARM) {
    return reminder.notificationAt ?? reminder.dueDate;
  }

  return startOfDay(now);
}

async function loadActiveReminders() {
  const now = new Date();
  const paymentWindowFloor = addDays(startOfDay(now), -31);

  return prisma.reminder.findMany({
    where: {
      isCompleted: false,
      OR: [
        {
          type: ReminderType.PAYMENT,
          dueDate: {
            gte: paymentWindowFloor
          }
        },
        {
          type: ReminderType.ALARM,
          notificationAt: {
            lte: endOfDay(addDays(now, 1))
          }
        }
      ]
    },
    include: {
      user: true
    },
    orderBy: { dueDate: "asc" }
  });
}

async function wasAlreadyProcessed(reminderId: string, channel: ReminderDeliveryChannel, scheduledFor: Date) {
  const existing = await prisma.reminderDelivery.findFirst({
    where: {
      reminderId,
      channel,
      scheduledFor
    }
  });

  return Boolean(existing);
}

async function recordDelivery({
  reminderId,
  channel,
  scheduledFor,
  status,
  message,
  errorMessage
}: {
  reminderId: string;
  channel: ReminderDeliveryChannel;
  scheduledFor: Date;
  status: ReminderDeliveryStatus;
  message?: string;
  errorMessage?: string;
}) {
  await prisma.reminderDelivery.create({
    data: {
      reminderId,
      channel,
      scheduledFor,
      status,
      sentAt: status === ReminderDeliveryStatus.SENT ? new Date() : null,
      message,
      errorMessage
    }
  });
}

async function dispatchChannel(reminder: ReminderWithUser, channel: ReminderDeliveryChannel, scheduledFor: Date) {
  if (await wasAlreadyProcessed(reminder.id, channel, scheduledFor)) {
    return { sent: 0, skipped: 1, failed: 0 };
  }

  try {
    const result =
      channel === ReminderDeliveryChannel.EMAIL
        ? await sendEmail(reminder)
        : channel === ReminderDeliveryChannel.WHATSAPP
          ? await sendWhatsApp(reminder)
          : await sendPush(reminder);

    await recordDelivery({
      reminderId: reminder.id,
      channel,
      scheduledFor,
      status: result.status,
      message: result.message
    });

    if (result.status === ReminderDeliveryStatus.SENT) {
      await prisma.reminder.update({
        where: { id: reminder.id },
        data: { lastNotifiedAt: new Date() }
      });
      return { sent: 1, skipped: 0, failed: 0 };
    }

    return { sent: 0, skipped: 1, failed: 0 };
  } catch (error) {
    await recordDelivery({
      reminderId: reminder.id,
      channel,
      scheduledFor,
      status: ReminderDeliveryStatus.FAILED,
      errorMessage: error instanceof Error ? error.message : "Fallo desconocido"
    });

    return { sent: 0, skipped: 0, failed: 1 };
  }
}

export async function dispatchReminderNotifications() {
  const now = new Date();
  const reminders = await loadActiveReminders();
  const summary = {
    evaluated: 0,
    sent: 0,
    skipped: 0,
    failed: 0
  };

  for (const reminder of reminders) {
    const shouldNotify =
      reminder.type === ReminderType.PAYMENT
        ? isWithinPaymentWindow(reminder, now)
        : isAlarmDue(reminder, now);

    if (!shouldNotify) {
      continue;
    }

    summary.evaluated += 1;
    const scheduledFor = getScheduledFor(reminder, now);
    const channels: ReminderDeliveryChannel[] = [];

    if (reminder.notifyEmail) {
      channels.push(ReminderDeliveryChannel.EMAIL);
    }

    if (reminder.notifyPush) {
      channels.push(ReminderDeliveryChannel.PUSH);
    }

    if (reminder.notifyWhatsApp) {
      channels.push(ReminderDeliveryChannel.WHATSAPP);
    }

    for (const channel of channels) {
      const result = await dispatchChannel(reminder, channel, scheduledFor);
      summary.sent += result.sent;
      summary.skipped += result.skipped;
      summary.failed += result.failed;
    }
  }

  return summary;
}
