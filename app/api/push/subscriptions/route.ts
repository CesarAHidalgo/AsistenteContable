import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await request.json();

  const endpoint = String(body?.endpoint ?? "").trim();
  const p256dhKey = String(body?.keys?.p256dh ?? "").trim();
  const authKey = String(body?.keys?.auth ?? "").trim();

  if (!endpoint || !p256dhKey || !authKey) {
    return Response.json({ error: "Invalid subscription" }, { status: 400 });
  }

  await prisma.pushSubscription.upsert({
    where: { endpoint },
    update: {
      p256dhKey,
      authKey,
      userId: user.id
    },
    create: {
      endpoint,
      p256dhKey,
      authKey,
      userId: user.id
    }
  });

  return Response.json({ ok: true });
}
