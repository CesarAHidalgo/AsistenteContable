import { dispatchReminderNotifications } from "@/lib/reminder-notifications";
import { logError, logInfo, logWarn } from "@/lib/observability";

function isAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();

  if (!secret) {
    return false;
  }

  const header = request.headers.get("x-cron-secret")?.trim();
  return header === secret;
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    logWarn("reminders.dispatch.unauthorized", { route: "/api/internal/reminders/dispatch" });
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const summary = await dispatchReminderNotifications();
    logInfo("reminders.dispatch.success", {
      route: "/api/internal/reminders/dispatch",
      ...summary
    });
    return Response.json(summary);
  } catch (error) {
    logError("reminders.dispatch.failed", error, { route: "/api/internal/reminders/dispatch" });
    return Response.json({ error: "Dispatch failed" }, { status: 500 });
  }
}
