import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST } from "@/app/api/instances/route";
import { GET as getById, PUT, DELETE } from "@/app/api/instances/[id]/route";
import { InstanceStatus } from "@prisma/client";

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
    instance: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
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

const mockUser = {
  id: "user-123",
  email: "admin@clawmemaybe.com",
  name: "Admin",
  role: "ADMIN" as const,
  sessionId: "session-admin-123",
};

const mockInstance = {
  id: "instance-123",
  name: "Test Instance",
  description: "A test instance",
  status: InstanceStatus.OFFLINE,
  gatewayUrl: "https://gateway.example.com",
  token: "secret-token",
  createdById: "user-123",
  createdAt: new Date("2024-01-01T00:00:00Z"),
  updatedAt: new Date("2024-01-01T00:00:00Z"),
};

describe("Instances API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/instances", () => {
    it("should return 401 when not authenticated", async () => {
      vi.mocked(getSession).mockResolvedValueOnce(null);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return list of instances when authenticated", async () => {
      vi.mocked(getSession).mockResolvedValueOnce(mockUser);
      vi.mocked(prisma.instance.findMany).mockResolvedValueOnce([mockInstance]);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toHaveLength(1);
      expect(data.data[0].name).toBe("Test Instance");
      expect(prisma.instance.findMany).toHaveBeenCalledWith({
        orderBy: { createdAt: "desc" },
      });
    });
  });

  describe("POST /api/instances", () => {
    it("should return 401 when not authenticated", async () => {
      vi.mocked(getSession).mockResolvedValueOnce(null);

      const request = createRequest("http://localhost/api/instances", {
        method: "POST",
        body: {
          name: "New Instance",
          gatewayUrl: "https://gw.com",
          token: "token",
        },
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 400 when name is missing", async () => {
      vi.mocked(getSession).mockResolvedValueOnce(mockUser);

      const request = createRequest("http://localhost/api/instances", {
        method: "POST",
        body: { gatewayUrl: "https://gw.com", token: "token" },
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Name, gatewayUrl, and token are required");
    });

    it("should return 400 when gatewayUrl is missing", async () => {
      vi.mocked(getSession).mockResolvedValueOnce(mockUser);

      const request = createRequest("http://localhost/api/instances", {
        method: "POST",
        body: { name: "New Instance", token: "token" },
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Name, gatewayUrl, and token are required");
    });

    it("should return 400 when token is missing", async () => {
      vi.mocked(getSession).mockResolvedValueOnce(mockUser);

      const request = createRequest("http://localhost/api/instances", {
        method: "POST",
        body: { name: "New Instance", gatewayUrl: "https://gw.com" },
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Name, gatewayUrl, and token are required");
    });

    it("should create instance successfully", async () => {
      vi.mocked(getSession).mockResolvedValueOnce(mockUser);
      vi.mocked(prisma.instance.create).mockResolvedValueOnce(mockInstance);
      vi.mocked(prisma.auditLog.create).mockResolvedValueOnce({} as never);

      const request = createRequest("http://localhost/api/instances", {
        method: "POST",
        body: {
          name: "Test Instance",
          description: "A test instance",
          gatewayUrl: "https://gateway.example.com",
          token: "secret-token",
        },
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.message).toBe("Instance created successfully");
      expect(data.data.name).toBe("Test Instance");
    });
  });

  describe("GET /api/instances/[id]", () => {
    it("should return 401 when not authenticated", async () => {
      vi.mocked(getSession).mockResolvedValueOnce(null);

      const request = createRequest(
        "http://localhost/api/instances/instance-123"
      );
      const response = await getById(request, {
        params: createParams("instance-123"),
      });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 404 when instance not found", async () => {
      vi.mocked(getSession).mockResolvedValueOnce(mockUser);
      vi.mocked(prisma.instance.findUnique).mockResolvedValueOnce(null);

      const request = createRequest(
        "http://localhost/api/instances/nonexistent"
      );
      const response = await getById(request, {
        params: createParams("nonexistent"),
      });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Instance not found");
    });

    it("should return instance when found", async () => {
      vi.mocked(getSession).mockResolvedValueOnce(mockUser);
      vi.mocked(prisma.instance.findUnique).mockResolvedValueOnce(mockInstance);

      const request = createRequest(
        "http://localhost/api/instances/instance-123"
      );
      const response = await getById(request, {
        params: createParams("instance-123"),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.name).toBe("Test Instance");
    });
  });

  describe("PUT /api/instances/[id]", () => {
    it("should return 401 when not authenticated", async () => {
      vi.mocked(getSession).mockResolvedValueOnce(null);

      const request = createRequest(
        "http://localhost/api/instances/instance-123",
        {
          method: "PUT",
          body: { name: "Updated Name" },
        }
      );
      const response = await PUT(request, {
        params: createParams("instance-123"),
      });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 404 when instance not found", async () => {
      vi.mocked(getSession).mockResolvedValueOnce(mockUser);
      vi.mocked(prisma.instance.update).mockRejectedValueOnce(
        new Error("Record not found")
      );

      const request = createRequest(
        "http://localhost/api/instances/nonexistent",
        {
          method: "PUT",
          body: { name: "Updated Name" },
        }
      );
      const response = await PUT(request, {
        params: createParams("nonexistent"),
      });
      const data = await response.json();

      expect(response.status).toBe(500); // Error is caught
      expect(data.error).toBe("Internal server error");
    });

    it("should update instance successfully", async () => {
      vi.mocked(getSession).mockResolvedValueOnce(mockUser);
      const updatedInstance = { ...mockInstance, name: "Updated Name" };
      vi.mocked(prisma.instance.update).mockResolvedValueOnce(updatedInstance);
      vi.mocked(prisma.auditLog.create).mockResolvedValueOnce({} as never);

      const request = createRequest(
        "http://localhost/api/instances/instance-123",
        {
          method: "PUT",
          body: { name: "Updated Name" },
        }
      );
      const response = await PUT(request, {
        params: createParams("instance-123"),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe("Instance updated successfully");
      expect(data.data.name).toBe("Updated Name");
    });
  });

  describe("DELETE /api/instances/[id]", () => {
    it("should return 401 when not authenticated", async () => {
      vi.mocked(getSession).mockResolvedValueOnce(null);

      const request = createRequest(
        "http://localhost/api/instances/instance-123",
        {
          method: "DELETE",
        }
      );
      const response = await DELETE(request, {
        params: createParams("instance-123"),
      });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should delete instance successfully", async () => {
      vi.mocked(getSession).mockResolvedValueOnce(mockUser);
      vi.mocked(prisma.instance.delete).mockResolvedValueOnce(mockInstance);
      vi.mocked(prisma.auditLog.create).mockResolvedValueOnce({} as never);

      const request = createRequest(
        "http://localhost/api/instances/instance-123",
        {
          method: "DELETE",
        }
      );
      const response = await DELETE(request, {
        params: createParams("instance-123"),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe("Instance deleted successfully");
      expect(prisma.instance.delete).toHaveBeenCalledWith({
        where: { id: "instance-123" },
      });
    });
  });
});
