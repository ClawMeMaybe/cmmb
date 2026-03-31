import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Routes that don't require authentication
// Note: /api/openclaw/* uses Gateway token auth, not session auth
const publicRoutes = ["/login", "/api/auth/login", "/api/openclaw"];

// Routes that should be accessible without auth
const isPublicRoute = (pathname: string): boolean => {
  return publicRoutes.some((route) => pathname.startsWith(route));
};

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check for session cookie first (for debugging)
  const sessionUserId = request.cookies.get("session_user_id")?.value;
  console.log(
    `[Middleware] ${pathname} - Cookie: ${sessionUserId ? "present" : "missing"}`
  );

  // Allow public routes
  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  // Allow static files and Next.js internals
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".") // Static files
  ) {
    return NextResponse.next();
  }

  // If no session, redirect to login
  if (!sessionUserId) {
    console.log(`[Middleware] Redirecting to login from ${pathname}`);
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  console.log(`[Middleware] Allowing access to ${pathname}`);
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
