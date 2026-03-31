import { describe, it, expect, vi, beforeEach } from "vitest";
import { PATCH } from "@/app/api/instances/[id]/action/route";
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
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
  },
}));

vi.mock("@/lib/auth", () => ({
  getSession: vi.fn(),
}));

vi.mock("@/lib/gateway", () => ({
  createGatewayClient: vi.fn(),
}));

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { createGatewayClient } from "@/lib/gateway";

// Helper to create mock NextRequest
function createRequest(url: string, body?: unknown): NextRequest {
  return new NextRequest(url, {
    method: "PATCH",
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
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

const mockOfflineInstance = {
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

const mockOnlineInstance = {
  ...mockOfflineInstance,
  status: InstanceStatus.ONLINE,
};

const mockStartingInstance = {
  ...mockOfflineInstance,
  status: InstanceStatus.STARTING,
};

// Helper to create a mock gateway client
function createMockGatewayClient(executeActionResult: unknown) {
  return {
    executeAction: vi.fn().mockResolvedValue(executeActionResult),
  } as unknown as ReturnType<typeof createGatewayClient>;
}

describe("Instance Action API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("PATCH /api/instances/[id]/action", () => {
    it("should return 401 when not authenticated", async () => {
      vi.mocked(getSession).mockResolvedValueOnce(null);

      const request = createRequest(
        "http://localhost/api/instances/instance-123/action",
        { action: "start" }
      );
      const response = await PATCH(request, {
        params: createParams("instance-123"),
      });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 403 when user is not admin", async () => {
      vi.mocked(getSession).mockResolvedValueOnce(mockViewerUser);

      const request = createRequest(
        "http://localhost/api/instances/instance-123/action",
        { action: "start" }
      );
      const response = await PATCH(request, {
        params: createParams("instance-123"),
      });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Forbidden: Admin role required");
    });

    it("should return 400 when action is invalid", async () => {
      vi.mocked(getSession).mockResolvedValueOnce(mockAdminUser);

      const request = createRequest(
        "http://localhost/api/instances/instance-123/action",
        { action: "invalid" }
      );
      const response = await PATCH(request, {
        params: createParams("instance-123"),
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("Invalid action");
    });

    it("should return 404 when instance not found", async () => {
      vi.mocked(getSession).mockResolvedValueOnce(mockAdminUser);
      vi.mocked(prisma.instance.findUnique).mockResolvedValueOnce(null);

      const request = createRequest(
        "http://localhost/api/instances/nonexistent/action",
        { action: "start" }
      );
      const response = await PATCH(request, {
        params: createParams("nonexistent"),
      });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Instance not found");
    });

    it("should return 409 when instance is in STARTING state", async () => {
      vi.mocked(getSession).mockResolvedValueOnce(mockAdminUser);
      vi.mocked(prisma.instance.findUnique).mockResolvedValueOnce(
        mockStartingInstance
      );

      const request = createRequest(
        "http://localhost/api/instances/instance-123/action",
        { action: "start" }
      );
      const response = await PATCH(request, {
        params: createParams("instance-123"),
      });
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.error).toContain("currently starting");
    });

    it("should start an offline instance successfully", async () => {
      vi.mocked(getSession).mockResolvedValueOnce(mockAdminUser);
      vi.mocked(prisma.instance.findUnique).mockResolvedValueOnce(
        mockOfflineInstance
      );
      vi.mocked(prisma.instance.update).mockResolvedValue({
        ...mockOfflineInstance,
        status: InstanceStatus.ONLINE,
      });
      vi.mocked(prisma.auditLog.create).mockResolvedValue({} as never);

      const mockGatewayClient = createMockGatewayClient({ success: true });
      vi.mocked(createGatewayClient).mockReturnValue(mockGatewayClient);

      const request = createRequest(
        "http://localhost/api/instances/instance-123/action",
        { action: "start" }
      );
      const response = await PATCH(request, {
        params: createParams("instance-123"),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe("Instance started successfully");
      expect(mockGatewayClient.executeAction).toHaveBeenCalledWith("start");
    });

    it("should stop an online instance successfully", async () => {
      vi.mocked(getSession).mockResolvedValueOnce(mockAdminUser);
      vi.mocked(prisma.instance.findUnique).mockResolvedValueOnce(
        mockOnlineInstance
      );
      vi.mocked(prisma.instance.update).mockResolvedValue({
        ...mockOnlineInstance,
        status: InstanceStatus.OFFLINE,
      });
      vi.mocked(prisma.auditLog.create).mockResolvedValue({} as never);

      const mockGatewayClient = createMockGatewayClient({ success: true });
      vi.mocked(createGatewayClient).mockReturnValue(mockGatewayClient);

      const request = createRequest(
        "http://localhost/api/instances/instance-123/action",
        { action: "stop" }
      );
      const response = await PATCH(request, {
        params: createParams("instance-123"),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe("Instance stopped successfully");
      expect(mockGatewayClient.executeAction).toHaveBeenCalledWith("stop");
    });

    it("should restart an online instance successfully", async () => {
      vi.mocked(getSession).mockResolvedValueOnce(mockAdminUser);
      vi.mocked(prisma.instance.findUnique).mockResolvedValueOnce(
        mockOnlineInstance
      );
      vi.mocked(prisma.instance.update).mockResolvedValue({
        ...mockOnlineInstance,
        status: InstanceStatus.ONLINE,
      });
      vi.mocked(prisma.auditLog.create).mockResolvedValue({} as never);

      const mockGatewayClient = createMockGatewayClient({ success: true });
      vi.mocked(createGatewayClient).mockReturnValue(mockGatewayClient);

      const request = createRequest(
        "http://localhost/api/instances/instance-123/action",
        { action: "restart" }
      );
      const response = await PATCH(request, {
        params: createParams("instance-123"),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe("Instance restarted successfully");
      expect(mockGatewayClient.executeAction).toHaveBeenCalledWith("restart");
    });

    it("should handle gateway failure and set ERROR status", async () => {
      vi.mocked(getSession).mockResolvedValueOnce(mockAdminUser);
      vi.mocked(prisma.instance.findUnique).mockResolvedValueOnce(
        mockOfflineInstance
      );
      vi.mocked(prisma.instance.update).mockResolvedValue({
        ...mockOfflineInstance,
        status: InstanceStatus.ERROR,
      });
      vi.mocked(prisma.auditLog.create).mockResolvedValue({} as never);

      const mockGatewayClient = createMockGatewayClient({
        success: false,
        error: "Connection refused",
      });
      vi.mocked(createGatewayClient).mockReturnValue(mockGatewayClient);

      const request = createRequest(
        "http://localhost/api/instances/instance-123/action",
        { action: "start" }
      );
      const response = await PATCH(request, {
        params: createParams("instance-123"),
      });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Connection refused");
    });
  });
});
