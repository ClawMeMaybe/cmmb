import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  RATE_LIMIT_CONFIG,
  getClientIdentifier,
  getRateLimitForPath,
  checkRateLimit,
  getRateLimitHeaders,
  resetRateLimit,
  clearRateLimitStore,
  getRateLimitStoreSize,
} from "@/lib/rate-limit";
import type { NextRequest } from "next/server";

// Mock NextRequest
function createMockRequest(
  headers: Record<string, string> = {},
  cookies: Record<string, string> = {}
): NextRequest {
  const mockHeaders = new Headers(headers);
  const mockCookies = new Map(Object.entries(cookies));

  return {
    headers: mockHeaders,
    cookies: {
      get: (name: string) => {
        const value = mockCookies.get(name);
        return value ? { name, value } : undefined;
      },
    },
  } as unknown as NextRequest;
}

describe("Rate limiting utilities", () => {
  beforeEach(() => {
    clearRateLimitStore();
  });

  describe("RATE_LIMIT_CONFIG", () => {
    it("should have correct default limits", () => {
      expect(RATE_LIMIT_CONFIG.AUTHENTICATED.LIMIT).toBe(100);
      expect(RATE_LIMIT_CONFIG.UNAUTHENTICATED.LIMIT).toBe(20);
    });

    it("should have stricter limits for login endpoint", () => {
      expect(
        RATE_LIMIT_CONFIG.ENDPOINTS["/api/auth/login"].UNAUTHENTICATED.LIMIT
      ).toBe(5);
      expect(
        RATE_LIMIT_CONFIG.ENDPOINTS["/api/auth/login"].AUTHENTICATED.LIMIT
      ).toBe(10);
    });

    it("should have correct window size", () => {
      expect(RATE_LIMIT_CONFIG.WINDOW_MS).toBe(60000);
    });
  });

  describe("getClientIdentifier", () => {
    it("should use user ID for authenticated requests", () => {
      const request = createMockRequest();
      const identifier = getClientIdentifier(request, "user123");

      expect(identifier).toBe("user:user123");
    });

    it("should use x-forwarded-for IP for unauthenticated requests", () => {
      const request = createMockRequest({
        "x-forwarded-for": "192.168.1.1, 10.0.0.1",
      });
      const identifier = getClientIdentifier(request);

      expect(identifier).toBe("ip:192.168.1.1");
    });

    it("should use x-real-ip when x-forwarded-for is not available", () => {
      const request = createMockRequest({
        "x-real-ip": "192.168.1.2",
      });
      const identifier = getClientIdentifier(request);

      expect(identifier).toBe("ip:192.168.1.2");
    });

    it("should use cf-connecting-ip when available", () => {
      const request = createMockRequest({
        "x-forwarded-for": "192.168.1.1",
        "cf-connecting-ip": "192.168.1.3",
      });
      const identifier = getClientIdentifier(request);

      expect(identifier).toBe("ip:192.168.1.3");
    });

    it("should fallback to 'unknown' when no IP headers are present", () => {
      const request = createMockRequest();
      const identifier = getClientIdentifier(request);

      expect(identifier).toBe("ip:unknown");
    });
  });

  describe("getRateLimitForPath", () => {
    it("should return default authenticated limit for general API routes", () => {
      const limit = getRateLimitForPath("/api/instances", true);

      expect(limit).toBe(RATE_LIMIT_CONFIG.AUTHENTICATED.LIMIT);
    });

    it("should return default unauthenticated limit for general API routes", () => {
      const limit = getRateLimitForPath("/api/instances", false);

      expect(limit).toBe(RATE_LIMIT_CONFIG.UNAUTHENTICATED.LIMIT);
    });

    it("should return stricter limit for login endpoint", () => {
      const limit = getRateLimitForPath("/api/auth/login", false);

      expect(limit).toBe(
        RATE_LIMIT_CONFIG.ENDPOINTS["/api/auth/login"].UNAUTHENTICATED.LIMIT
      );
    });

    it("should return authenticated limit for login endpoint when authenticated", () => {
      const limit = getRateLimitForPath("/api/auth/login", true);

      expect(limit).toBe(
        RATE_LIMIT_CONFIG.ENDPOINTS["/api/auth/login"].AUTHENTICATED.LIMIT
      );
    });

    it("should return stricter limit for password endpoint", () => {
      const limit = getRateLimitForPath("/api/auth/password", false);

      expect(limit).toBe(
        RATE_LIMIT_CONFIG.ENDPOINTS["/api/auth/password"].UNAUTHENTICATED.LIMIT
      );
    });
  });

  describe("checkRateLimit", () => {
    it("should allow first request", () => {
      const result = checkRateLimit("test-identifier", 10);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(9);
      expect(result.limit).toBe(10);
    });

    it("should decrement remaining count", () => {
      checkRateLimit("test-identifier", 10);
      const result = checkRateLimit("test-identifier", 10);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(8);
    });

    it("should block when limit is reached", () => {
      const identifier = "blocked-test";
      const limit = 3;

      // Make requests up to the limit
      checkRateLimit(identifier, limit);
      checkRateLimit(identifier, limit);
      checkRateLimit(identifier, limit);

      // Fourth request should be blocked
      const result = checkRateLimit(identifier, limit);

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.retryAfter).toBeDefined();
      expect(result.retryAfter).toBeGreaterThan(0);
    });

    it("should reset counter in new window", async () => {
      vi.useFakeTimers();

      const identifier = "window-test";
      const limit = 3;

      // Make requests in current window
      checkRateLimit(identifier, limit);
      checkRateLimit(identifier, limit);

      // Move to next window
      vi.advanceTimersByTime(RATE_LIMIT_CONFIG.WINDOW_MS + 1000);

      // Should start fresh in new window
      const result = checkRateLimit(identifier, limit);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(limit - 1);

      vi.useRealTimers();
    });

    it("should track different identifiers separately", () => {
      checkRateLimit("user1", 10);
      checkRateLimit("user1", 10);

      const result1 = checkRateLimit("user1", 10);
      const result2 = checkRateLimit("user2", 10);

      expect(result1.remaining).toBe(7);
      expect(result2.remaining).toBe(9);
    });

    it("should include reset timestamp", () => {
      const result = checkRateLimit("reset-test", 10);

      expect(result.reset).toBeDefined();
      expect(result.reset).toBeGreaterThan(Math.floor(Date.now() / 1000));
    });
  });

  describe("getRateLimitHeaders", () => {
    it("should return standard rate limit headers", () => {
      const result = checkRateLimit("header-test", 10);
      const headers = getRateLimitHeaders(result);

      expect(headers["X-RateLimit-Limit"]).toBe("10");
      expect(headers["X-RateLimit-Remaining"]).toBe("9");
      expect(headers["X-RateLimit-Reset"]).toBeDefined();
    });

    it("should include Retry-After header when blocked", () => {
      const identifier = "retry-header-test";
      const limit = 2;

      checkRateLimit(identifier, limit);
      checkRateLimit(identifier, limit);
      const result = checkRateLimit(identifier, limit);
      const headers = getRateLimitHeaders(result);

      expect(headers["Retry-After"]).toBeDefined();
    });

    it("should not include Retry-After when not blocked", () => {
      const result = checkRateLimit("no-retry-test", 10);
      const headers = getRateLimitHeaders(result);

      expect(headers["Retry-After"]).toBeUndefined();
    });
  });

  describe("resetRateLimit", () => {
    it("should reset counter for specific identifier", () => {
      const identifier = "reset-identifier-test";
      const limit = 5;

      checkRateLimit(identifier, limit);
      checkRateLimit(identifier, limit);
      checkRateLimit(identifier, limit);

      resetRateLimit(identifier);
      const result = checkRateLimit(identifier, limit);

      expect(result.remaining).toBe(limit - 1);
    });
  });

  describe("clearRateLimitStore", () => {
    it("should clear all rate limit data", () => {
      checkRateLimit("clear-test-1", 10);
      checkRateLimit("clear-test-2", 10);

      expect(getRateLimitStoreSize()).toBe(2);

      clearRateLimitStore();

      expect(getRateLimitStoreSize()).toBe(0);
    });
  });

  describe("getRateLimitStoreSize", () => {
    it("should return correct store size", () => {
      clearRateLimitStore();

      expect(getRateLimitStoreSize()).toBe(0);

      checkRateLimit("size-test-1", 10);
      expect(getRateLimitStoreSize()).toBe(1);

      checkRateLimit("size-test-2", 10);
      expect(getRateLimitStoreSize()).toBe(2);
    });
  });
});
