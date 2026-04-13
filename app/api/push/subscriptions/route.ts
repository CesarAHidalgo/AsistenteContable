import { getCurrentUser } from "@/lib/auth";
import { parseApiJson, pushSubscriptionPostSchema } from "@/lib/api-v1-schemas";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = await parseApiJson(request, pushSubscriptionPostSchema);
  if (parsed instanceof Response) {
    return parsed;
  }

  const { endpoint, keys } = parsed;

  await prisma.pushSubscription.upsert({
    where: { endpoint },
    update: {
      p256dhKey: keys.p256dh,
      authKey: keys.auth,
      userId: user.id
    },
    create: {
      endpoint,
      p256dhKey: keys.p256dh,
      authKey: keys.auth,
      userId: user.id
    }
  });

  return Response.json({ ok: true });
}
