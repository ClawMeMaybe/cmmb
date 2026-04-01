import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  getClientIdentifier,
  getRateLimitForPath,
  checkRateLimit,
  getRateLimitHeaders,
  createRateLimitResponse,
} from "@/lib/rate-limit";

// Routes that don't require authentication
// Note: /api/openclaw/* uses Gateway token auth, not session auth
const publicRoutes = ["/login", "/api/auth/login", "/api/openclaw"];

// Routes that should be accessible without auth
const isPublicRoute = (pathname: string): boolean => {
  return publicRoutes.some((route) => pathname.startsWith(route));
};

// Check if path is an API route that should be rate limited
const isApiRoute = (pathname: string): boolean => {
  return pathname.startsWith("/api/");
};

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check for session cookie first (for debugging)
  const sessionUserId = request.cookies.get("session_token")?.value;
  const isAuthenticated = Boolean(sessionUserId);
  console.log(
    `[Middleware] ${pathname} - Cookie: ${sessionUserId ? "present" : "missing"}`
  );

  // Rate limit API routes
  if (isApiRoute(pathname)) {
    const identifier = getClientIdentifier(request, sessionUserId);
    const limit = getRateLimitForPath(pathname, isAuthenticated);
    const result = checkRateLimit(identifier, limit);

    // If rate limited, return 429
    if (!result.allowed) {
      console.log(`[Middleware] Rate limited: ${identifier} on ${pathname}`);
      return createRateLimitResponse(result);
    }

    // Allow public routes with rate limit headers
    if (isPublicRoute(pathname)) {
      const response = NextResponse.next();
      // Add rate limit headers to response
      const headers = getRateLimitHeaders(result);
      for (const [key, value] of Object.entries(headers)) {
        response.headers.set(key, value);
      }
      return response;
    }

    // For protected API routes, check authentication
    if (!sessionUserId) {
      const response = NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
      // Still add rate limit headers
      const headers = getRateLimitHeaders(result);
      for (const [key, value] of Object.entries(headers)) {
        response.headers.set(key, value);
      }
      return response;
    }

    // Allow authenticated API request with rate limit headers
    const response = NextResponse.next();
    const headers = getRateLimitHeaders(result);
    for (const [key, value] of Object.entries(headers)) {
      response.headers.set(key, value);
    }
    return response;
  }

  // Allow public routes (non-API)
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
