import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const WINDOW_MS = 60_000;

type Bucket = { count: number; resetAt: number };

function getStore(): Map<string, Bucket> {
  const globalStore = globalThis as typeof globalThis & { __acRateLimit?: Map<string, Bucket> };
  if (!globalStore.__acRateLimit) {
    globalStore.__acRateLimit = new Map();
  }
  return globalStore.__acRateLimit;
}

function checkEdgeRateLimit(key: string, max: number): { ok: true } | { ok: false; retryAfterSec: number } {
  const store = getStore();
  const now = Date.now();
  const existing = store.get(key);

  if (!existing || now > existing.resetAt) {
    store.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { ok: true };
  }

  if (existing.count >= max) {
    return { ok: false, retryAfterSec: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)) };
  }

  existing.count += 1;
  return { ok: true };
}

function clientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (forwarded) {
    return forwarded;
  }
  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) {
    return realIp;
  }
  return "unknown";
}

export function rateLimitApiResponse(request: NextRequest, kind: "api-v1" | "auth"): NextResponse | null {
  const limits = { "api-v1": 120, auth: 25 } as const;
  const result = checkEdgeRateLimit(`${kind}:${clientIp(request)}`, limits[kind]);
  if (!result.ok) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": String(result.retryAfterSec) } }
    );
  }
  return null;
}
