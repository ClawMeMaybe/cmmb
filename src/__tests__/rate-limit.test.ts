import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  getClientIdentifier,
  checkRateLimit,
  getRateLimitConfig,
  createRateLimitHeaders,
  clearRateLimitStore,
  rateLimitPresets,
} from "@/lib/rate-limit";

describe("rate-limit", () => {
  beforeEach(() => {
    clearRateLimitStore();
    vi.useRealTimers();
  });

  describe("getClientIdentifier", () => {
    it("should return the first IP from x-forwarded-for header", () => {
      const request = new Request("http://localhost/test", {
        headers: { "x-forwarded-for": "192.168.1.1, 10.0.0.1" },
      });
      expect(getClientIdentifier(request)).toBe("192.168.1.1");
    });

    it("should handle single IP in x-forwarded-for", () => {
      const request = new Request("http://localhost/test", {
        headers: { "x-forwarded-for": "192.168.1.1" },
      });
      expect(getClientIdentifier(request)).toBe("192.168.1.1");
    });

    it("should trim whitespace from forwarded IP", () => {
      const request = new Request("http://localhost/test", {
        headers: { "x-forwarded-for": "  192.168.1.1  , 10.0.0.1" },
      });
      expect(getClientIdentifier(request)).toBe("192.168.1.1");
    });

    it("should return 'unknown' when no IP info available", () => {
      const request = new Request("http://localhost/test");
      expect(getClientIdentifier(request)).toBe("unknown");
    });
  });

  describe("getRateLimitConfig", () => {
    it("should return auth config for login endpoint", () => {
      const config = getRateLimitConfig("/api/auth/login");
      expect(config).toEqual(rateLimitPresets.auth);
    });

    it("should return health config for health endpoint", () => {
      const config = getRateLimitConfig("/api/health");
      expect(config).toEqual(rateLimitPresets.health);
    });

    it("should return public config for other API endpoints", () => {
      const config = getRateLimitConfig("/api/instances");
      expect(config).toEqual(rateLimitPresets.public);
    });

    it("should return undefined for non-API routes", () => {
      const config = getRateLimitConfig("/dashboard");
      expect(config).toBeUndefined();
    });
  });

  describe("checkRateLimit", () => {
    it("should allow requests under the limit", () => {
      const result = checkRateLimit("test-client", rateLimitPresets.auth);
      expect(result.success).toBe(true);
      expect(result.limit).toBe(10);
      expect(result.remaining).toBe(9);
    });

    it("should decrement remaining on each request", () => {
      checkRateLimit("test-client-2", rateLimitPresets.auth);
      checkRateLimit("test-client-2", rateLimitPresets.auth);
      const result = checkRateLimit("test-client-2", rateLimitPresets.auth);
      expect(result.remaining).toBe(7);
    });

    it("should block requests over the limit", () => {
      const clientId = "limited-client";
      const config = { ...rateLimitPresets.auth, maxRequests: 3 };

      // Make 3 requests (the limit)
      checkRateLimit(clientId, config);
      checkRateLimit(clientId, config);
      checkRateLimit(clientId, config);

      // 4th request should be blocked
      const result = checkRateLimit(clientId, config);
      expect(result.success).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.retryAfter).toBeDefined();
    });

    it("should return retryAfter in seconds", () => {
      vi.useFakeTimers();

      const clientId = "retry-test";
      const config = { ...rateLimitPresets.auth, maxRequests: 2 };

      checkRateLimit(clientId, config);
      checkRateLimit(clientId, config);
      const result = checkRateLimit(clientId, config);

      expect(result.retryAfter).toBeGreaterThan(0);
      expect(result.retryAfter).toBeLessThanOrEqual(60); // Should be <= 60 seconds

      vi.useRealTimers();
    });

    it("should reset after window expires", () => {
      vi.useFakeTimers();

      const clientId = "reset-test";
      const config = {
        ...rateLimitPresets.auth,
        maxRequests: 2,
        windowMs: 1000,
      };

      // Use up the limit
      checkRateLimit(clientId, config);
      checkRateLimit(clientId, config);
      const blockedResult = checkRateLimit(clientId, config);
      expect(blockedResult.success).toBe(false);

      // Advance time past the window
      vi.advanceTimersByTime(1001);

      // Should work again
      const result = checkRateLimit(clientId, config);
      expect(result.success).toBe(true);

      vi.useRealTimers();
    });

    it("should track different clients separately", () => {
      const config = { ...rateLimitPresets.auth, maxRequests: 2 };

      // Client A uses up their limit
      checkRateLimit("client-a", config);
      checkRateLimit("client-a", config);

      // Client B should still have full limit
      const resultB = checkRateLimit("client-b", config);
      expect(resultB.success).toBe(true);
      expect(resultB.remaining).toBe(1);
    });
  });

  describe("createRateLimitHeaders", () => {
    it("should create standard rate limit headers", () => {
      const result = checkRateLimit("header-test", rateLimitPresets.public);
      const headers = createRateLimitHeaders(result);

      expect(headers["X-RateLimit-Limit"]).toBe("100");
      expect(headers["X-RateLimit-Remaining"]).toBeDefined();
      expect(headers["X-RateLimit-Reset"]).toBeDefined();
    });

    it("should include Retry-After header when rate limited", () => {
      vi.useFakeTimers();

      const clientId = "header-retry-test";
      const config = { ...rateLimitPresets.auth, maxRequests: 1 };

      checkRateLimit(clientId, config);
      const result = checkRateLimit(clientId, config);
      const headers = createRateLimitHeaders(result);

      expect(headers["Retry-After"]).toBeDefined();

      vi.useRealTimers();
    });

    it("should not include Retry-After when not rate limited", () => {
      const result = checkRateLimit("no-retry-header", rateLimitPresets.public);
      const headers = createRateLimitHeaders(result);

      expect(headers["Retry-After"]).toBeUndefined();
    });
  });

  describe("rate limit presets", () => {
    it("should have correct public preset values", () => {
      expect(rateLimitPresets.public.maxRequests).toBe(100);
      expect(rateLimitPresets.public.windowMs).toBe(60_000);
      expect(rateLimitPresets.public.keyPrefix).toBe("public");
    });

    it("should have correct auth preset values", () => {
      expect(rateLimitPresets.auth.maxRequests).toBe(10);
      expect(rateLimitPresets.auth.windowMs).toBe(60_000);
      expect(rateLimitPresets.auth.keyPrefix).toBe("auth");
    });

    it("should have correct health preset values", () => {
      expect(rateLimitPresets.health.maxRequests).toBe(30);
      expect(rateLimitPresets.health.windowMs).toBe(60_000);
      expect(rateLimitPresets.health.keyPrefix).toBe("health");
    });
  });
});
