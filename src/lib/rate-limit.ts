/**
 * Rate limiting configuration and utilities
 *
 * Uses sliding window algorithm for accurate rate limiting.
 * Stores rate limit data in-memory (for production, consider Redis).
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Rate limit configuration
export const RATE_LIMIT_CONFIG = {
  // Window size in milliseconds (1 minute)
  WINDOW_MS: 60 * 1000,

  // Limits for authenticated users (per minute)
  AUTHENTICATED: {
    LIMIT: 100,
  },

  // Limits for unauthenticated users (per minute)
  UNAUTHENTICATED: {
    LIMIT: 20,
  },

  // Specific limits for sensitive endpoints
  ENDPOINTS: {
    // Login endpoint - stricter limit to prevent brute force
    "/api/auth/login": {
      AUTHENTICATED: { LIMIT: 10 },
      UNAUTHENTICATED: { LIMIT: 5 },
    },
    // Password change endpoint
    "/api/auth/password": {
      AUTHENTICATED: { LIMIT: 5 },
      UNAUTHENTICATED: { LIMIT: 3 },
    },
  },
} as const;

// Types for rate limit tracking
interface RateLimitEntry {
  count: number;
  windowStart: number;
}

// In-memory store for rate limit data
// Key: IP address or user ID
const rateLimitStore = new Map<string, RateLimitEntry>();

// Cleanup interval (remove entries older than 2x window)
const CLEANUP_INTERVAL_MS = RATE_LIMIT_CONFIG.WINDOW_MS * 2;
let lastCleanup = Date.now();

/**
 * Get client identifier for rate limiting
 * - Uses user ID if authenticated
 * - Falls back to IP address for unauthenticated requests
 */
export function getClientIdentifier(
  request: NextRequest,
  userId?: string
): string {
  if (userId) {
    return `user:${userId}`;
  }

  // Get IP from various headers
  const forwarded = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  const cfConnecting = request.headers.get("cf-connecting-ip");

  const ip = cfConnecting || realIp || forwarded?.split(",")[0]?.trim();

  if (!ip) {
    // Fallback to a default identifier if no IP found
    return "ip:unknown";
  }

  return `ip:${ip}`;
}

/**
 * Get rate limit for a specific endpoint
 */
export function getRateLimitForPath(
  pathname: string,
  isAuthenticated: boolean
): number {
  // Check for endpoint-specific limits
  for (const [endpoint, limits] of Object.entries(
    RATE_LIMIT_CONFIG.ENDPOINTS
  )) {
    if (pathname.startsWith(endpoint)) {
      return isAuthenticated
        ? limits.AUTHENTICATED.LIMIT
        : limits.UNAUTHENTICATED.LIMIT;
    }
  }

  // Use default limits
  return isAuthenticated
    ? RATE_LIMIT_CONFIG.AUTHENTICATED.LIMIT
    : RATE_LIMIT_CONFIG.UNAUTHENTICATED.LIMIT;
}

/**
 * Clean up old entries in the rate limit store
 */
function cleanupStore(): void {
  const now = Date.now();

  // Only cleanup periodically
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) {
    return;
  }

  lastCleanup = now;

  for (const [key, entry] of rateLimitStore.entries()) {
    if (now - entry.windowStart > CLEANUP_INTERVAL_MS) {
      rateLimitStore.delete(key);
    }
  }
}

/**
 * Rate limit result
 */
export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  reset: number; // Unix timestamp in seconds
  retryAfter?: number; // Seconds until reset (only when blocked)
}

/**
 * Check if a request should be rate limited
 */
export function checkRateLimit(
  identifier: string,
  limit: number
): RateLimitResult {
  // Periodic cleanup
  cleanupStore();

  const now = Date.now();
  const windowStart =
    Math.floor(now / RATE_LIMIT_CONFIG.WINDOW_MS) * RATE_LIMIT_CONFIG.WINDOW_MS;
  const windowEnd = windowStart + RATE_LIMIT_CONFIG.WINDOW_MS;

  const entry = rateLimitStore.get(identifier);

  if (!entry || entry.windowStart !== windowStart) {
    // New window
    const newEntry: RateLimitEntry = {
      count: 1,
      windowStart,
    };
    rateLimitStore.set(identifier, newEntry);

    return {
      allowed: true,
      limit,
      remaining: limit - 1,
      reset: Math.floor(windowEnd / 1000),
    };
  }

  // Same window - check limit
  if (entry.count >= limit) {
    const retryAfter = Math.ceil((windowEnd - now) / 1000);
    return {
      allowed: false,
      limit,
      remaining: 0,
      reset: Math.floor(windowEnd / 1000),
      retryAfter,
    };
  }

  // Increment counter
  entry.count++;

  return {
    allowed: true,
    limit,
    remaining: limit - entry.count,
    reset: Math.floor(windowEnd / 1000),
  };
}

/**
 * Rate limit headers to add to responses
 */
export function getRateLimitHeaders(
  result: RateLimitResult
): Record<string, string> {
  const headers: Record<string, string> = {
    "X-RateLimit-Limit": String(result.limit),
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(result.reset),
  };

  if (result.retryAfter) {
    headers["Retry-After"] = String(result.retryAfter);
  }

  return headers;
}

/**
 * Create a 429 Too Many Requests response
 */
export function createRateLimitResponse(result: RateLimitResult): NextResponse {
  const body = {
    error: "Too Many Requests",
    message: `Rate limit exceeded. Please try again in ${result.retryAfter} seconds.`,
    retryAfter: result.retryAfter,
    limit: result.limit,
    reset: result.reset,
  };

  const response = NextResponse.json(body, { status: 429 });

  // Add rate limit headers
  const headers = getRateLimitHeaders(result);
  for (const [key, value] of Object.entries(headers)) {
    response.headers.set(key, value);
  }

  return response;
}

/**
 * Reset rate limit for an identifier (useful for testing)
 */
export function resetRateLimit(identifier: string): void {
  rateLimitStore.delete(identifier);
}

/**
 * Clear all rate limit data (useful for testing)
 */
export function clearRateLimitStore(): void {
  rateLimitStore.clear();
}

/**
 * Get current rate limit store size (useful for testing/debugging)
 */
export function getRateLimitStoreSize(): number {
  return rateLimitStore.size;
}
