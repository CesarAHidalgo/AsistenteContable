import type { NextFetchEvent, NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { withAuth, type NextRequestWithAuth } from "next-auth/middleware";
import { rateLimitApiResponse } from "@/lib/edge-rate-limit";

const authSecret = process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET;

type NextAuthMiddlewareRequest = NextRequest & { nextauth?: { token?: unknown } };

const pageAuthMiddleware = withAuth(
  function middleware(request: NextAuthMiddlewareRequest) {
    const pathname = request.nextUrl.pathname;
    const isPublicRoute = pathname === "/login" || pathname === "/registro";

    if (isPublicRoute && request.nextauth?.token) {
      return NextResponse.redirect(new URL("/", request.url));
    }

    return NextResponse.next();
  },
  {
    secret: authSecret,
    pages: {
      signIn: "/login"
    },
    callbacks: {
      authorized: ({ token, req }) => {
        const pathname = req.nextUrl.pathname;
        const isPublicRoute = pathname === "/login" || pathname === "/registro";
        return isPublicRoute || !!token;
      }
    }
  }
);

export default function middleware(request: NextRequest, event: NextFetchEvent) {
  const pathname = request.nextUrl.pathname;

  if (pathname.startsWith("/api/v1")) {
    const limited = rateLimitApiResponse(request, "api-v1");
    if (limited) {
      return limited;
    }
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/auth")) {
    if (request.method === "POST") {
      const limited = rateLimitApiResponse(request, "auth");
      if (limited) {
        return limited;
      }
    }
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  return pageAuthMiddleware(request as NextRequestWithAuth, event);
}

export const config = {
  matcher: ["/api/v1/:path*", "/api/auth/:path*", "/((?!api|_next/static|_next/image|favicon.ico).*)"]
};
