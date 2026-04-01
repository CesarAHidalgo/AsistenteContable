import { dispatchReminderNotifications } from "@/lib/reminder-notifications";

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
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const summary = await dispatchReminderNotifications();
  return Response.json(summary);
}
