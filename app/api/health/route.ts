import { logInfo } from "@/lib/observability";

export async function GET() {
  logInfo("health.check", { route: "/api/health" });

  return Response.json({
    status: "ok",
    service: "AsistenteContable",
    timestamp: new Date().toISOString()
  });
}
