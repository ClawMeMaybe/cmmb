import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  createProxyConfig,
  buildTargetUrl,
  buildProxyHeaders,
  createTimeoutController,
  createErrorResponse,
  proxyRequest,
  PROXY_ERROR_CODES,
  DEFAULT_PROXY_TIMEOUT,
  type ProxyConfig,
} from "@/lib/openclaw-proxy";

describe("OpenClaw Proxy", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.clearAllMocks();
  });

  describe("createProxyConfig", () => {
    it("should return null when OPENCLAW_GATEWAY_TOKEN is not set", () => {
      delete process.env.OPENCLAW_GATEWAY_TOKEN;
      delete process.env.OPENCLAW_GATEWAY_URL;

      const config = createProxyConfig();
      expect(config).toBeNull();
    });

    it("should return config with default URL when only token is set", () => {
      process.env.OPENCLAW_GATEWAY_TOKEN = "test-token";
      delete process.env.OPENCLAW_GATEWAY_URL;

      const config = createProxyConfig();
      expect(config).toEqual({
        gatewayUrl: "http://localhost:18789",
        gatewayToken: "test-token",
        timeout: DEFAULT_PROXY_TIMEOUT,
      });
    });

    it("should return config with custom URL when set", () => {
      process.env.OPENCLAW_GATEWAY_TOKEN = "test-token";
      process.env.OPENCLAW_GATEWAY_URL = "http://custom-gateway:8080";

      const config = createProxyConfig();
      expect(config).toEqual({
        gatewayUrl: "http://custom-gateway:8080",
        gatewayToken: "test-token",
        timeout: DEFAULT_PROXY_TIMEOUT,
      });
    });
  });

  describe("buildTargetUrl", () => {
    it("should build URL with path", () => {
      const url = buildTargetUrl(
        "http://localhost:18789",
        "/api/instance/status"
      );
      expect(url).toBe("http://localhost:18789/api/instance/status");
    });

    it("should handle path without leading slash", () => {
      const url = buildTargetUrl(
        "http://localhost:18789",
        "api/instance/status"
      );
      expect(url).toBe("http://localhost:18789/api/instance/status");
    });

    it("should handle gateway URL with trailing slash", () => {
      const url = buildTargetUrl(
        "http://localhost:18789/",
        "/api/instance/status"
      );
      expect(url).toBe("http://localhost:18789/api/instance/status");
    });

    it("should include query parameters", () => {
      const searchParams = new URLSearchParams({ foo: "bar", baz: "qux" });
      const url = buildTargetUrl(
        "http://localhost:18789",
        "/api/test",
        searchParams
      );
      expect(url).toBe("http://localhost:18789/api/test?foo=bar&baz=qux");
    });

    it("should handle empty query parameters", () => {
      const searchParams = new URLSearchParams();
      const url = buildTargetUrl(
        "http://localhost:18789",
        "/api/test",
        searchParams
      );
      expect(url).toBe("http://localhost:18789/api/test");
    });
  });

  describe("buildProxyHeaders", () => {
    it("should add Authorization header with Bearer token", () => {
      const incomingHeaders = new Headers();
      const proxyHeaders = buildProxyHeaders(incomingHeaders, "my-token");

      expect(proxyHeaders.get("Authorization")).toBe("Bearer my-token");
    });

    it("should forward Content-Type header", () => {
      const incomingHeaders = new Headers();
      incomingHeaders.set("Content-Type", "application/json");
      const proxyHeaders = buildProxyHeaders(incomingHeaders, "token");

      expect(proxyHeaders.get("Content-Type")).toBe("application/json");
    });

    it("should forward Accept header", () => {
      const incomingHeaders = new Headers();
      incomingHeaders.set("Accept", "application/json");
      const proxyHeaders = buildProxyHeaders(incomingHeaders, "token");

      expect(proxyHeaders.get("Accept")).toBe("application/json");
    });

    it("should not forward Authorization header from incoming request", () => {
      const incomingHeaders = new Headers();
      incomingHeaders.set("Authorization", "Bearer incoming-token");
      const proxyHeaders = buildProxyHeaders(incomingHeaders, "gateway-token");

      expect(proxyHeaders.get("Authorization")).toBe("Bearer gateway-token");
    });

    it("should not forward Cookie header", () => {
      const incomingHeaders = new Headers();
      incomingHeaders.set("Cookie", "session=abc123");
      const proxyHeaders = buildProxyHeaders(incomingHeaders, "token");

      expect(proxyHeaders.get("Cookie")).toBeNull();
    });

    it("should not forward Host header", () => {
      const incomingHeaders = new Headers();
      incomingHeaders.set("Host", "example.com");
      const proxyHeaders = buildProxyHeaders(incomingHeaders, "token");

      expect(proxyHeaders.get("Host")).toBeNull();
    });
  });

  describe("createTimeoutController", () => {
    it("should create an AbortController", () => {
      const { controller } = createTimeoutController(1000);
      expect(controller).toBeInstanceOf(AbortController);
    });

    it("should abort after timeout", async () => {
      vi.useFakeTimers();
      const { controller } = createTimeoutController(1000);

      expect(controller.signal.aborted).toBe(false);

      vi.advanceTimersByTime(1000);

      expect(controller.signal.aborted).toBe(true);

      vi.useRealTimers();
    });

    it("should return timeout ID for clearing", () => {
      const { timeoutId } = createTimeoutController(1000);
      expect(timeoutId).toBeDefined();
      clearTimeout(timeoutId); // Clean up
    });
  });

  describe("createErrorResponse", () => {
    it("should create JSON error response", async () => {
      const response = createErrorResponse(
        "Gateway not configured",
        503,
        PROXY_ERROR_CODES.NOT_CONFIGURED
      );

      expect(response.status).toBe(503);
      const data = await response.json();
      expect(data).toEqual({
        error: "Gateway not configured",
        code: PROXY_ERROR_CODES.NOT_CONFIGURED,
      });
    });

    it("should create timeout error response", async () => {
      const response = createErrorResponse(
        "Request timed out",
        504,
        PROXY_ERROR_CODES.TIMEOUT
      );

      expect(response.status).toBe(504);
      const data = await response.json();
      expect(data.code).toBe(PROXY_ERROR_CODES.TIMEOUT);
    });
  });

  describe("proxyRequest", () => {
    const mockConfig: ProxyConfig = {
      gatewayUrl: "http://localhost:18789",
      gatewayToken: "test-token",
      timeout: 5000,
    };

    it("should proxy GET request successfully", async () => {
      const mockResponse = new Response(JSON.stringify({ status: "ok" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });

      global.fetch = vi.fn().mockResolvedValueOnce(mockResponse);

      const request = new Request("http://localhost:3000/api/openclaw/health", {
        method: "GET",
      });

      const response = await proxyRequest(request, mockConfig);

      expect(response.status).toBe(200);
      expect(fetch).toHaveBeenCalledWith(
        "http://localhost:18789/health",
        expect.objectContaining({
          method: "GET",
          headers: expect.any(Headers),
        })
      );
    });

    it("should proxy POST request with body", async () => {
      const mockResponse = new Response(JSON.stringify({ success: true }), {
        status: 200,
      });

      global.fetch = vi.fn().mockResolvedValueOnce(mockResponse);

      const request = new Request(
        "http://localhost:3000/api/openclaw/api/instance/start",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "start" }),
        }
      );

      const response = await proxyRequest(request, mockConfig);

      expect(response.status).toBe(200);
      expect(fetch).toHaveBeenCalledWith(
        "http://localhost:18789/api/instance/start",
        expect.objectContaining({
          method: "POST",
        })
      );
    });

    it("should include query parameters in target URL", async () => {
      const mockResponse = new Response("{}", { status: 200 });
      global.fetch = vi.fn().mockResolvedValueOnce(mockResponse);

      const request = new Request(
        "http://localhost:3000/api/openclaw/api/instances?status=online",
        { method: "GET" }
      );

      await proxyRequest(request, mockConfig);

      expect(fetch).toHaveBeenCalledWith(
        "http://localhost:18789/api/instances?status=online",
        expect.any(Object)
      );
    });

    it("should add Authorization header", async () => {
      const mockResponse = new Response("{}", { status: 200 });
      global.fetch = vi.fn().mockResolvedValueOnce(mockResponse);

      const request = new Request("http://localhost:3000/api/openclaw/health", {
        method: "GET",
      });

      await proxyRequest(request, mockConfig);

      const fetchCall = vi.mocked(fetch).mock.calls[0];
      const headers = fetchCall[1]?.headers as Headers;
      expect(headers.get("Authorization")).toBe("Bearer test-token");
    });

    it("should return timeout error on abort", async () => {
      vi.useFakeTimers();

      // Create a fetch that never resolves
      global.fetch = vi.fn().mockImplementation(
        () =>
          new Promise((_, reject) => {
            // This will be aborted
          })
      );

      const request = new Request("http://localhost:3000/api/openclaw/health", {
        method: "GET",
      });

      const responsePromise = proxyRequest(request, mockConfig);

      // Advance timers to trigger timeout
      await vi.advanceTimersByTimeAsync(10000);

      const response = await responsePromise;

      expect(response.status).toBe(504);
      const data = await response.json();
      expect(data.code).toBe(PROXY_ERROR_CODES.TIMEOUT);

      vi.useRealTimers();
    });

    it("should return connection error on fetch failure", async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error("Connection refused"));

      const request = new Request("http://localhost:3000/api/openclaw/health", {
        method: "GET",
      });

      const response = await proxyRequest(request, mockConfig);

      expect(response.status).toBe(502);
      const data = await response.json();
      expect(data.code).toBe(PROXY_ERROR_CODES.CONNECTION_ERROR);
    });
  });
});
