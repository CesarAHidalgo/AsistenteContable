import { authenticateApiRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const user = await authenticateApiRequest(request);

  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const reminders = await prisma.reminder.findMany({
    where: { userId: user.id },
    orderBy: { dueDate: "asc" }
  });

  return Response.json(
    reminders.map((item) => ({
      ...item,
      amount: item.amount?.toNumber() ?? null
    }))
  );
}

export async function POST(request: Request) {
  const user = await authenticateApiRequest(request);

  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const type = String(body.type ?? "PAYMENT");
  const reminder = await prisma.reminder.create({
    data: {
      userId: user.id,
      title: String(body.title ?? ""),
      type: type === "ALARM" ? "ALARM" : "PAYMENT",
      amount: body.amount ? Number(body.amount) : null,
      dueDate: new Date(String(body.dueDate ?? new Date().toISOString())),
      notificationAt: type === "ALARM" && body.notificationAt ? new Date(String(body.notificationAt)) : null,
      notifyDaysBefore: type === "PAYMENT" ? Number(body.notifyDaysBefore ?? 5) : 0,
      notifyEmail: body.notifyEmail !== false,
      notifyPush: Boolean(body.notifyPush),
      notifyWhatsApp: Boolean(body.notifyWhatsApp)
    }
  });

  return Response.json(
    {
      ...reminder,
      amount: reminder.amount?.toNumber() ?? null
    },
    { status: 201 }
  );
}
