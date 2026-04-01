import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST } from "@/app/api/alerts/route";
import { GET as getById, PATCH, DELETE } from "@/app/api/alerts/[id]/route";

// Mock dependencies
vi.mock("next/headers", () => ({
  cookies: vi.fn(() =>
    Promise.resolve({
      get: vi.fn().mockReturnValue({ value: "test-user-id" }),
      set: vi.fn(),
      delete: vi.fn(),
    })
  ),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    alert: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
      updateMany: vi.fn(),
    },
    instance: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("@/lib/auth", () => ({
  getSession: vi.fn(),
}));

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// Helper to create mock NextRequest
function createRequest(
  url: string,
  options?: { method?: string; body?: unknown }
): NextRequest {
  return new NextRequest(url, {
    method: options?.method ?? "GET",
    headers: options?.body ? { "Content-Type": "application/json" } : {},
    body: options?.body ? JSON.stringify(options.body) : undefined,
  });
}

// Helper to create route params
function createParams(id: string) {
  return Promise.resolve({ id });
}

const mockAdminUser = {
  id: "user-123",
  email: "admin@clawmemaybe.com",
  name: "Admin",
  role: "ADMIN" as const,
};

const mockViewerUser = {
  id: "user-456",
  email: "viewer@clawmemaybe.com",
  name: "Viewer",
  role: "VIEWER" as const,
};

const mockAlert = {
  id: "alert-123",
  title: "Test Alert",
  message: "This is a test alert message",
  severity: "WARNING" as const,
  status: "ACTIVE" as const,
  source: "system",
  metadata: null,
  createdAt: new Date("2024-01-01T00:00:00Z"),
  updatedAt: new Date("2024-01-01T00:00:00Z"),
  resolvedAt: null,
  instanceId: null,
  acknowledgedById: null,
  instance: null,
  acknowledgedBy: null,
};

const mockAlertWithInstance = {
  ...mockAlert,
  id: "alert-456",
  instanceId: "instance-123",
  instance: {
    id: "instance-123",
    name: "Test Instance",
    status: "ONLINE" as const,
  },
};

describe("Alerts API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/alerts", () => {
    it("should return 401 when not authenticated", async () => {
      vi.mocked(getSession).mockResolvedValueOnce(null);

      const response = await GET(createRequest("http://localhost/api/alerts"));
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return list of alerts when authenticated", async () => {
      vi.mocked(getSession).mockResolvedValueOnce(mockAdminUser);
      vi.mocked(prisma.alert.findMany).mockResolvedValueOnce([mockAlert]);
      vi.mocked(prisma.alert.count).mockResolvedValueOnce(1);

      const response = await GET(createRequest("http://localhost/api/alerts"));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.alerts).toHaveLength(1);
      expect(data.data.alerts[0].title).toBe("Test Alert");
      expect(data.data.pagination.total).toBe(1);
    });

    it("should filter alerts by status", async () => {
      vi.mocked(getSession).mockResolvedValueOnce(mockAdminUser);
      vi.mocked(prisma.alert.findMany).mockResolvedValueOnce([mockAlert]);
      vi.mocked(prisma.alert.count).mockResolvedValueOnce(1);

      const response = await GET(
        createRequest("http://localhost/api/alerts?status=ACTIVE")
      );

      expect(response.status).toBe(200);
      expect(prisma.alert.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: "ACTIVE" }),
        })
      );
    });

    it("should filter alerts by instanceId", async () => {
      vi.mocked(getSession).mockResolvedValueOnce(mockAdminUser);
      vi.mocked(prisma.alert.findMany).mockResolvedValueOnce([
        mockAlertWithInstance,
      ]);
      vi.mocked(prisma.alert.count).mockResolvedValueOnce(1);

      const response = await GET(
        createRequest("http://localhost/api/alerts?instanceId=instance-123")
      );

      expect(response.status).toBe(200);
      expect(prisma.alert.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ instanceId: "instance-123" }),
        })
      );
    });
  });

  describe("POST /api/alerts", () => {
    it("should return 401 when not authenticated", async () => {
      vi.mocked(getSession).mockResolvedValueOnce(null);

      const request = createRequest("http://localhost/api/alerts", {
        method: "POST",
        body: { title: "New Alert", message: "Alert message" },
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 403 for non-admin users", async () => {
      vi.mocked(getSession).mockResolvedValueOnce(mockViewerUser);

      const request = createRequest("http://localhost/api/alerts", {
        method: "POST",
        body: { title: "New Alert", message: "Alert message" },
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Only admins can create alerts");
    });

    it("should return 400 when title is missing", async () => {
      vi.mocked(getSession).mockResolvedValueOnce(mockAdminUser);

      const request = createRequest("http://localhost/api/alerts", {
        method: "POST",
        body: { message: "Alert message" },
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Title and message are required");
    });

    it("should return 400 when message is missing", async () => {
      vi.mocked(getSession).mockResolvedValueOnce(mockAdminUser);

      const request = createRequest("http://localhost/api/alerts", {
        method: "POST",
        body: { title: "New Alert" },
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Title and message are required");
    });

    it("should create alert successfully", async () => {
      vi.mocked(getSession).mockResolvedValueOnce(mockAdminUser);
      vi.mocked(prisma.alert.create).mockResolvedValueOnce(mockAlert);

      const request = createRequest("http://localhost/api/alerts", {
        method: "POST",
        body: {
          title: "Test Alert",
          message: "This is a test alert message",
        },
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.message).toBe("Alert created successfully");
      expect(data.data.title).toBe("Test Alert");
    });

    it("should create alert with instanceId", async () => {
      vi.mocked(getSession).mockResolvedValueOnce(mockAdminUser);
      vi.mocked(prisma.alert.create).mockResolvedValueOnce(
        mockAlertWithInstance
      );

      const request = createRequest("http://localhost/api/alerts", {
        method: "POST",
        body: {
          title: "Instance Alert",
          message: "Instance is offline",
          instanceId: "instance-123",
          severity: "CRITICAL",
        },
      });
      const response = await POST(request);

      expect(response.status).toBe(201);
      expect(prisma.alert.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            instanceId: "instance-123",
            severity: "CRITICAL",
          }),
        })
      );
    });
  });

  describe("GET /api/alerts/[id]", () => {
    it("should return 401 when not authenticated", async () => {
      vi.mocked(getSession).mockResolvedValueOnce(null);

      const request = createRequest("http://localhost/api/alerts/alert-123");
      const response = await getById(request, {
        params: createParams("alert-123"),
      });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 404 when alert not found", async () => {
      vi.mocked(getSession).mockResolvedValueOnce(mockAdminUser);
      vi.mocked(prisma.alert.findUnique).mockResolvedValueOnce(null);

      const request = createRequest("http://localhost/api/alerts/nonexistent");
      const response = await getById(request, {
        params: createParams("nonexistent"),
      });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Alert not found");
    });

    it("should return alert when found", async () => {
      vi.mocked(getSession).mockResolvedValueOnce(mockAdminUser);
      vi.mocked(prisma.alert.findUnique).mockResolvedValueOnce(mockAlert);

      const request = createRequest("http://localhost/api/alerts/alert-123");
      const response = await getById(request, {
        params: createParams("alert-123"),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.title).toBe("Test Alert");
    });
  });

  describe("PATCH /api/alerts/[id]", () => {
    it("should return 401 when not authenticated", async () => {
      vi.mocked(getSession).mockResolvedValueOnce(null);

      const request = createRequest("http://localhost/api/alerts/alert-123", {
        method: "PATCH",
        body: { status: "RESOLVED" },
      });
      const response = await PATCH(request, {
        params: createParams("alert-123"),
      });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should acknowledge alert with current user", async () => {
      vi.mocked(getSession).mockResolvedValueOnce(mockAdminUser);
      const acknowledgedAlert = {
        ...mockAlert,
        status: "ACKNOWLEDGED" as const,
        acknowledgedById: "user-123",
        acknowledgedBy: mockAdminUser,
      };
      vi.mocked(prisma.alert.update).mockResolvedValueOnce(acknowledgedAlert);

      const request = createRequest("http://localhost/api/alerts/alert-123", {
        method: "PATCH",
        body: { acknowledgedById: true },
      });
      const response = await PATCH(request, {
        params: createParams("alert-123"),
      });

      expect(response.status).toBe(200);
      expect(prisma.alert.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            acknowledgedById: "user-123",
            status: "ACKNOWLEDGED",
          }),
        })
      );
    });

    it("should resolve alert", async () => {
      vi.mocked(getSession).mockResolvedValueOnce(mockAdminUser);
      const resolvedAlert = {
        ...mockAlert,
        status: "RESOLVED" as const,
        resolvedAt: new Date(),
      };
      vi.mocked(prisma.alert.update).mockResolvedValueOnce(resolvedAlert);

      const request = createRequest("http://localhost/api/alerts/alert-123", {
        method: "PATCH",
        body: { status: "RESOLVED" },
      });
      const response = await PATCH(request, {
        params: createParams("alert-123"),
      });

      expect(response.status).toBe(200);
      expect(prisma.alert.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: "RESOLVED",
            resolvedAt: expect.any(Date),
          }),
        })
      );
    });
  });

  describe("DELETE /api/alerts/[id]", () => {
    it("should return 401 when not authenticated", async () => {
      vi.mocked(getSession).mockResolvedValueOnce(null);

      const request = createRequest("http://localhost/api/alerts/alert-123", {
        method: "DELETE",
      });
      const response = await DELETE(request, {
        params: createParams("alert-123"),
      });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 403 for non-admin users", async () => {
      vi.mocked(getSession).mockResolvedValueOnce(mockViewerUser);

      const request = createRequest("http://localhost/api/alerts/alert-123", {
        method: "DELETE",
      });
      const response = await DELETE(request, {
        params: createParams("alert-123"),
      });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Only admins can delete alerts");
    });

    it("should delete alert successfully for admin", async () => {
      vi.mocked(getSession).mockResolvedValueOnce(mockAdminUser);
      vi.mocked(prisma.alert.delete).mockResolvedValueOnce(mockAlert);

      const request = createRequest("http://localhost/api/alerts/alert-123", {
        method: "DELETE",
      });
      const response = await DELETE(request, {
        params: createParams("alert-123"),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe("Alert deleted successfully");
      expect(prisma.alert.delete).toHaveBeenCalledWith({
        where: { id: "alert-123" },
      });
    });
  });
});
