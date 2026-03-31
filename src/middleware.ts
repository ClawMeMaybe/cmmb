import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  getClientIdentifier,
  checkRateLimit,
  getRateLimitConfig,
  createRateLimitHeaders,
} from "@/lib/rate-limit";

// Routes that don't require authentication
// Note: /api/openclaw/* uses Gateway token auth, not session auth
const publicRoutes = ["/login", "/api/auth/login", "/api/openclaw"];

// Routes that should be accessible without auth
const isPublicRoute = (pathname: string): boolean => {
  return publicRoutes.some((route) => pathname.startsWith(route));
};

/**
 * Helper to add rate limit headers to a response
 */
function addRateLimitHeaders(
  response: NextResponse,
  result: ReturnType<typeof checkRateLimit>
): void {
  const headers = createRateLimitHeaders(result);
  for (const [key, value] of Object.entries(headers)) {
    response.headers.set(key, value);
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Get client identifier for rate limiting
  const clientId = getClientIdentifier(request);

  // Check rate limiting for API routes
  const rateLimitConfig = getRateLimitConfig(pathname);
  if (rateLimitConfig) {
    const rateLimitResult = checkRateLimit(clientId, rateLimitConfig);

    if (!rateLimitResult.success) {
      console.log(
        `[Middleware] Rate limit exceeded for ${clientId} on ${pathname}`
      );

      const response = NextResponse.json(
        {
          error: "Too many requests. Please try again later.",
          retryAfter: rateLimitResult.retryAfter,
        },
        { status: 429 }
      );

      addRateLimitHeaders(response, rateLimitResult);
      return response;
    }

    // Process auth and routing, then add rate limit headers
    const response = processAuthAndRouting(request, pathname);
    addRateLimitHeaders(response, rateLimitResult);
    return response;
  }

  // No rate limiting - proceed normally
  return processAuthAndRouting(request, pathname);
}

/**
 * Handle authentication and routing logic
 */
function processAuthAndRouting(
  request: NextRequest,
  pathname: string
): NextResponse {
  // Check for session cookie first (for debugging)
  const sessionUserId = request.cookies.get("session_token")?.value;
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
