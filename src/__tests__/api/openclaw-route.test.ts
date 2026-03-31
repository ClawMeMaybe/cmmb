import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  GET,
  POST,
  PUT,
  PATCH,
  DELETE,
  HEAD,
  OPTIONS,
} from "@/app/api/openclaw/[...path]/route";

// Mock the proxy module
vi.mock("@/lib/openclaw-proxy", () => ({
  createProxyConfig: vi.fn(),
  proxyRequest: vi.fn(),
  createErrorResponse: vi.fn(),
  PROXY_ERROR_CODES: {
    NOT_CONFIGURED: "PROXY_NOT_CONFIGURED",
    TIMEOUT: "PROXY_TIMEOUT",
    CONNECTION_ERROR: "PROXY_CONNECTION_ERROR",
    INTERNAL_ERROR: "PROXY_INTERNAL_ERROR",
  },
}));

import {
  createProxyConfig,
  proxyRequest,
  createErrorResponse,
  PROXY_ERROR_CODES,
} from "@/lib/openclaw-proxy";

// Helper to create mock request
function createRequest(url: string, method: string, body?: unknown): Request {
  return new Request(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
}

// Helper to create params
function createParams(path: string[]) {
  return Promise.resolve({ path });
}

describe("OpenClaw Proxy Route", () => {
  const mockConfig = {
    gatewayUrl: "http://localhost:18789",
    gatewayToken: "test-token",
    timeout: 30000,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(createProxyConfig).mockReturnValue(mockConfig);
    vi.mocked(proxyRequest).mockResolvedValue(
      new Response(JSON.stringify({ status: "ok" }), { status: 200 })
    );
    vi.mocked(createErrorResponse).mockReturnValue(
      new Response(
        JSON.stringify({
          error: "Not configured",
          code: PROXY_ERROR_CODES.NOT_CONFIGURED,
        }),
        { status: 503 }
      )
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("GET", () => {
    it("should proxy GET requests", async () => {
      const request = createRequest(
        "http://localhost:3000/api/openclaw/health",
        "GET"
      );
      const response = await GET(request, { params: createParams(["health"]) });

      expect(proxyRequest).toHaveBeenCalledWith(request, mockConfig);
      expect(response.status).toBe(200);
    });

    it("should handle nested paths", async () => {
      const request = createRequest(
        "http://localhost:3000/api/openclaw/api/instance/status",
        "GET"
      );
      await GET(request, {
        params: createParams(["api", "instance", "status"]),
      });

      expect(proxyRequest).toHaveBeenCalled();
    });
  });

  describe("POST", () => {
    it("should proxy POST requests", async () => {
      const request = createRequest(
        "http://localhost:3000/api/openclaw/api/instance/start",
        "POST",
        { action: "start" }
      );
      const response = await POST(request, {
        params: createParams(["api", "instance", "start"]),
      });

      expect(proxyRequest).toHaveBeenCalledWith(request, mockConfig);
      expect(response.status).toBe(200);
    });
  });

  describe("PUT", () => {
    it("should proxy PUT requests", async () => {
      const request = createRequest(
        "http://localhost:3000/api/openclaw/api/config",
        "PUT",
        { key: "value" }
      );
      const response = await PUT(request, {
        params: createParams(["api", "config"]),
      });

      expect(proxyRequest).toHaveBeenCalledWith(request, mockConfig);
      expect(response.status).toBe(200);
    });
  });

  describe("PATCH", () => {
    it("should proxy PATCH requests", async () => {
      const request = createRequest(
        "http://localhost:3000/api/openclaw/api/config",
        "PATCH",
        { key: "value" }
      );
      const response = await PATCH(request, {
        params: createParams(["api", "config"]),
      });

      expect(proxyRequest).toHaveBeenCalledWith(request, mockConfig);
      expect(response.status).toBe(200);
    });
  });

  describe("DELETE", () => {
    it("should proxy DELETE requests", async () => {
      const request = createRequest(
        "http://localhost:3000/api/openclaw/api/resource/123",
        "DELETE"
      );
      const response = await DELETE(request, {
        params: createParams(["api", "resource", "123"]),
      });

      expect(proxyRequest).toHaveBeenCalledWith(request, mockConfig);
      expect(response.status).toBe(200);
    });
  });

  describe("HEAD", () => {
    it("should proxy HEAD requests", async () => {
      vi.mocked(proxyRequest).mockResolvedValueOnce(
        new Response(null, { status: 200 })
      );

      const request = createRequest(
        "http://localhost:3000/api/openclaw/health",
        "HEAD"
      );
      const response = await HEAD(request, {
        params: createParams(["health"]),
      });

      expect(proxyRequest).toHaveBeenCalledWith(request, mockConfig);
      expect(response.status).toBe(200);
    });
  });

  describe("OPTIONS", () => {
    it("should return CORS headers for preflight requests", async () => {
      const response = await OPTIONS();

      expect(response.status).toBe(204);
      expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
      expect(response.headers.get("Access-Control-Allow-Methods")).toContain(
        "GET"
      );
      expect(response.headers.get("Access-Control-Allow-Methods")).toContain(
        "POST"
      );
      expect(response.headers.get("Access-Control-Allow-Headers")).toContain(
        "Authorization"
      );
    });
  });

  describe("Error handling", () => {
    it("should return 503 when proxy not configured", async () => {
      vi.mocked(createProxyConfig).mockReturnValue(null);

      const request = createRequest(
        "http://localhost:3000/api/openclaw/health",
        "GET"
      );
      await GET(request, { params: createParams(["health"]) });

      expect(createErrorResponse).toHaveBeenCalledWith(
        expect.stringContaining("not configured"),
        503,
        PROXY_ERROR_CODES.NOT_CONFIGURED
      );
    });
  });
});
