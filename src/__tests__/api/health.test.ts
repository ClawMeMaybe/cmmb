import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "@/app/api/health/route";

// Mock prisma
vi.mock("@/lib/prisma", () => ({
  prisma: {
    $queryRaw: vi.fn(),
  },
}));

import { prisma } from "@/lib/prisma";

describe("Health API endpoint", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/health", () => {
    it("should return ok status when database is healthy", async () => {
      // Mock successful database query
      vi.mocked(prisma.$queryRaw).mockResolvedValueOnce([{ 1: 1 }]);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe("ok");
      expect(data.timestamp).toBeDefined();
      expect(data.version).toBeDefined();
      expect(data.checks.database.status).toBe("ok");
    });

    it("should return error status when database connection fails", async () => {
      // Mock failed database query
      vi.mocked(prisma.$queryRaw).mockRejectedValueOnce(
        new Error("Connection refused")
      );

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.status).toBe("error");
      expect(data.checks.database.status).toBe("error");
      expect(data.checks.database.message).toBe("Connection refused");
    });

    it("should include version in response", async () => {
      vi.mocked(prisma.$queryRaw).mockResolvedValueOnce([{ 1: 1 }]);

      const response = await GET();
      const data = await response.json();

      expect(data.version).toBeDefined();
      expect(typeof data.version).toBe("string");
    });

    it("should include timestamp in ISO format", async () => {
      vi.mocked(prisma.$queryRaw).mockResolvedValueOnce([{ 1: 1 }]);

      const response = await GET();
      const data = await response.json();

      expect(data.timestamp).toBeDefined();
      // Verify it's a valid ISO date string
      expect(new Date(data.timestamp).toISOString()).toBe(data.timestamp);
    });
  });
});
