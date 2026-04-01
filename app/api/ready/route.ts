import { prisma } from "@/lib/prisma";
import { logError, logInfo } from "@/lib/observability";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    logInfo("readiness.check", { route: "/api/ready", database: "ok" });

    return Response.json({
      status: "ready",
      service: "AsistenteContable",
      database: "ok",
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logError("readiness.check.failed", error, { route: "/api/ready" });

    return Response.json(
      {
        status: "degraded",
        service: "AsistenteContable",
        database: "error",
        timestamp: new Date().toISOString()
      },
      { status: 503 }
    );
  }
}
