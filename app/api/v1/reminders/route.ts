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
  const reminder = await prisma.reminder.create({
    data: {
      userId: user.id,
      title: String(body.title ?? ""),
      amount: body.amount ? Number(body.amount) : null,
      dueDate: new Date(String(body.dueDate ?? new Date().toISOString()))
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
