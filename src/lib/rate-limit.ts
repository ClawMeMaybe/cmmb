/**
 * Rate limiting library for API endpoints
 * Uses in-memory sliding window algorithm with configurable limits
 */

interface RateLimitEntry {
  count: number;
  windowStart: number;
}

interface RateLimitConfig {
  /** Maximum requests allowed per window */
  maxRequests: number;
  /** Window duration in milliseconds */
  windowMs: number;
  /** Key prefix for identification */
  keyPrefix: string;
}

interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
}

// In-memory store for rate limit entries
const rateLimitStore = new Map<string, RateLimitEntry>();

// Cleanup interval to prevent memory leaks
const CLEANUP_INTERVAL = 60_000; // 1 minute
const CLEANUP_THRESHOLD = 5 * 60_000; // 5 minutes

let cleanupTimer: ReturnType<typeof setInterval> | null = null;

/**
 * Start the cleanup timer to remove stale entries
 */
function startCleanup(): void {
  if (cleanupTimer) return;

  cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of rateLimitStore.entries()) {
      if (now - entry.windowStart > CLEANUP_THRESHOLD) {
        rateLimitStore.delete(key);
      }
    }
  }, CLEANUP_INTERVAL);
}

// Start cleanup on module load
startCleanup();

/**
 * Get client identifier from request
 * Uses X-Forwarded-For header if available, falls back to IP
 */
export function getClientIdentifier(request: Request): string {
  // Check for forwarded header (proxy/load balancer)
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    // Take the first IP in the chain (original client)
    return forwarded.split(",")[0].trim();
  }

  // Fall back to connection info (may be unavailable in edge runtime)
  // @ts-expect-error - Next.js specific property
  const ip = request.ip ?? "unknown";
  return ip;
}

/**
 * Default rate limit configurations
 */
export const rateLimitPresets = {
  /** Public endpoints: 100 requests per minute */
  public: {
    maxRequests: 100,
    windowMs: 60_000, // 1 minute
    keyPrefix: "public",
  } satisfies RateLimitConfig,

  /** Auth endpoints: 10 requests per minute (stricter for security) */
  auth: {
    maxRequests: 10,
    windowMs: 60_000, // 1 minute
    keyPrefix: "auth",
  } satisfies RateLimitConfig,

  /** Health checks: 30 requests per minute */
  health: {
    maxRequests: 30,
    windowMs: 60_000,
    keyPrefix: "health",
  } satisfies RateLimitConfig,
} as const;

/**
 * Check rate limit for a given key
 * Uses sliding window algorithm
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  const key = `${config.keyPrefix}:${identifier}`;
  const now = Date.now();

  let entry = rateLimitStore.get(key);

  // Reset window if expired
  if (!entry || now - entry.windowStart >= config.windowMs) {
    entry = {
      count: 0,
      windowStart: now,
    };
    rateLimitStore.set(key, entry);
  }

  const resetTime = entry.windowStart + config.windowMs;

  // Check if limit exceeded
  if (entry.count >= config.maxRequests) {
    const retryAfter = Math.ceil((resetTime - now) / 1000);
    return {
      success: false,
      limit: config.maxRequests,
      remaining: 0,
      resetTime,
      retryAfter,
    };
  }

  // Increment count
  entry.count++;
  rateLimitStore.set(key, entry);

  return {
    success: true,
    limit: config.maxRequests,
    remaining: config.maxRequests - entry.count,
    resetTime,
  };
}

/**
 * Get rate limit config for a path
 */
export function getRateLimitConfig(
  pathname: string
): RateLimitConfig | undefined {
  // Auth endpoints - stricter limits
  if (pathname.startsWith("/api/auth/login")) {
    return rateLimitPresets.auth;
  }

  // Health endpoint
  if (pathname === "/api/health") {
    return rateLimitPresets.health;
  }

  // Other API endpoints - standard limits
  if (pathname.startsWith("/api/")) {
    return rateLimitPresets.public;
  }

  // No rate limiting for non-API routes
  return undefined;
}

/**
 * Create rate limit headers for response
 */
export function createRateLimitHeaders(
  result: RateLimitResult
): Record<string, string> {
  const headers: Record<string, string> = {
    "X-RateLimit-Limit": String(result.limit),
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(Math.ceil(result.resetTime / 1000)),
  };

  if (result.retryAfter !== undefined) {
    headers["Retry-After"] = String(result.retryAfter);
  }

  return headers;
}

/**
 * Clear all rate limit entries (for testing)
 */
export function clearRateLimitStore(): void {
  rateLimitStore.clear();
}
