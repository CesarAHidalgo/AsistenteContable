import { NextResponse } from "next/server";
import { withAuth } from "next-auth/middleware";

const authSecret = process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET;

export default withAuth(
  function middleware(request) {
    const pathname = request.nextUrl.pathname;
    const isPublicRoute = pathname === "/login" || pathname === "/registro";

    if (isPublicRoute && request.nextauth.token) {
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

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"]
};
