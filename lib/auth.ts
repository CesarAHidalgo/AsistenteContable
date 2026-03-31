import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/auth-options";
import { hashToken } from "@/lib/crypto";
import { prisma } from "@/lib/prisma";

export async function getCurrentUser() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;

  if (!email) {
    return null;
  }

  return prisma.user.findUnique({
    where: { email: email.toLowerCase() }
  });
}

export async function requireUser() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}

export async function authenticateApiRequest(request: Request) {
  const header = request.headers.get("authorization");

  if (!header?.startsWith("Bearer ")) {
    return null;
  }

  const rawToken = header.slice("Bearer ".length).trim();
  const apiToken = await prisma.apiToken.findUnique({
    where: { tokenHash: hashToken(rawToken) },
    include: { user: true }
  });

  if (!apiToken || apiToken.revokedAt) {
    return null;
  }

  await prisma.apiToken.update({
    where: { id: apiToken.id },
    data: { lastUsedAt: new Date() }
  });

  return apiToken.user;
}
