import { authenticateApiRequest } from "@/lib/auth";
import { parseApiJson, reminderPostSchema } from "@/lib/api-v1-schemas";
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

  const parsed = await parseApiJson(request, reminderPostSchema);
  if (parsed instanceof Response) {
    return parsed;
  }

  const body = parsed;
  const type = body.type === "ALARM" ? "ALARM" : "PAYMENT";

  const reminder = await prisma.reminder.create({
    data: {
      userId: user.id,
      title: body.title,
      type,
      amount: body.amount ?? null,
      dueDate: body.dueDate,
      notificationAt: type === "ALARM" ? body.notificationAt : null,
      notifyDaysBefore: type === "PAYMENT" ? body.notifyDaysBefore : 0,
      notifyEmail: body.notifyEmail !== false,
      notifyPush: body.notifyPush === true,
      notifyWhatsApp: body.notifyWhatsApp === true
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
