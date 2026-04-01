import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "@/app/api/logs/route";

// Mock dependencies
vi.mock("next/headers", () => ({
  cookies: vi.fn(() =>
    Promise.resolve({
      get: vi.fn().mockReturnValue({ value: "test-user-id" }),
    })
  ),
}));

vi.mock("@/lib/auth", () => ({
  getSession: vi.fn(),
}));

vi.mock("@/server/logs", () => ({
  getLogs: vi.fn(),
}));

import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { getLogs } from "@/server/logs";

function createRequest(searchParams: Record<string, string> = {}): NextRequest {
  const url = new URL("http://localhost/api/logs");
  Object.entries(searchParams).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });
  return new NextRequest(url);
}

describe("Logs API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/logs", () => {
    it("should return 401 when not authenticated", async () => {
      vi.mocked(getSession).mockResolvedValueOnce(null);

      const request = createRequest();
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return logs when authenticated", async () => {
      vi.mocked(getSession).mockResolvedValueOnce({
        id: "user-id",
        email: "admin@clawmemaybe.com",
        name: "Admin",
        role: "ADMIN",
        sessionId: "session-id",
      });

      vi.mocked(getLogs).mockResolvedValueOnce({
        logs: [
          {
            id: "log-1",
            timestamp: "2026-04-01T10:00:00Z",
            level: "info",
            source: "gateway",
            message: "Test log message",
          },
        ],
        pagination: {
          page: 1,
          pageSize: 100,
          total: 1,
          totalPages: 1,
        },
      });

      const request = createRequest();
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.logs).toHaveLength(1);
      expect(data.data.logs[0].message).toBe("Test log message");
      expect(getLogs).toHaveBeenCalledWith({});
    });

    it("should pass query parameters to getLogs", async () => {
      vi.mocked(getSession).mockResolvedValueOnce({
        id: "user-id",
        email: "admin@clawmemaybe.com",
        name: "Admin",
        role: "ADMIN",
        sessionId: "session-id",
      });

      vi.mocked(getLogs).mockResolvedValueOnce({
        logs: [],
        pagination: { page: 1, pageSize: 50, total: 0, totalPages: 0 },
      });

      const request = createRequest({
        instanceId: "instance-123",
        level: "error",
        source: "gateway",
        search: "error",
        page: "2",
        pageSize: "50",
      });

      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(getLogs).toHaveBeenCalledWith({
        instanceId: "instance-123",
        level: "error",
        source: "gateway",
        search: "error",
        page: 2,
        pageSize: 50,
      });
    });

    it("should return 400 for invalid level parameter", async () => {
      vi.mocked(getSession).mockResolvedValueOnce({
        id: "user-id",
        email: "admin@clawmemaybe.com",
        name: "Admin",
        role: "ADMIN",
        sessionId: "session-id",
      });

      const request = createRequest({ level: "invalid" });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid level parameter");
    });

    it("should return 400 for invalid source parameter", async () => {
      vi.mocked(getSession).mockResolvedValueOnce({
        id: "user-id",
        email: "admin@clawmemaybe.com",
        name: "Admin",
        role: "ADMIN",
        sessionId: "session-id",
      });

      const request = createRequest({ source: "invalid" });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid source parameter");
    });
  });
});
