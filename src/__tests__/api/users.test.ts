import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST } from "@/app/api/users/route";
import { GET as getById, PUT, DELETE } from "@/app/api/users/[id]/route";
import { POST as resetPassword } from "@/app/api/users/[id]/reset-password/route";
import { Role } from "@prisma/client";

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
    user: {
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
  hashPassword: vi.fn((password: string) =>
    Promise.resolve(`hashed-${password}`)
  ),
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
  id: "admin-123",
  email: "admin@clawmemaybe.com",
  name: "Admin",
  role: "ADMIN" as Role,
};

const mockUser = {
  id: "user-123",
  email: "test@example.com",
  name: "Test User",
  role: "VIEWER" as Role,
  createdAt: new Date("2024-01-01T00:00:00Z"),
  updatedAt: new Date("2024-01-01T00:00:00Z"),
  password: "hashed-password",
};

describe("Users API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/users", () => {
    it("should return 401 when not authenticated", async () => {
      vi.mocked(getSession).mockResolvedValueOnce(null);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return list of users when authenticated", async () => {
      vi.mocked(getSession).mockResolvedValueOnce(mockAdminUser);
      vi.mocked(prisma.user.findMany).mockResolvedValueOnce([mockUser]);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toHaveLength(1);
      expect(data.data[0].email).toBe("test@example.com");
      expect(prisma.user.findMany).toHaveBeenCalledWith({
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
      });
    });
  });

  describe("POST /api/users", () => {
    it("should return 401 when not authenticated", async () => {
      vi.mocked(getSession).mockResolvedValueOnce(null);

      const request = createRequest("http://localhost/api/users", {
        method: "POST",
        body: { email: "new@example.com", password: "password123" },
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 400 when email is missing", async () => {
      vi.mocked(getSession).mockResolvedValueOnce(mockAdminUser);

      const request = createRequest("http://localhost/api/users", {
        method: "POST",
        body: { password: "password123" },
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Email and password are required");
    });

    it("should return 400 when password is missing", async () => {
      vi.mocked(getSession).mockResolvedValueOnce(mockAdminUser);

      const request = createRequest("http://localhost/api/users", {
        method: "POST",
        body: { email: "new@example.com" },
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Email and password are required");
    });

    it("should create user with default VIEWER role", async () => {
      vi.mocked(getSession).mockResolvedValueOnce(mockAdminUser);
      vi.mocked(prisma.user.create).mockResolvedValueOnce(mockUser);
      vi.mocked(prisma.auditLog.create).mockResolvedValueOnce({} as never);

      const request = createRequest("http://localhost/api/users", {
        method: "POST",
        body: { email: "new@example.com", password: "password123" },
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.message).toBe("User created successfully");
      expect(data.data.email).toBe("test@example.com");
    });

    it("should create user with ADMIN role when specified", async () => {
      vi.mocked(getSession).mockResolvedValueOnce(mockAdminUser);
      const adminUser = { ...mockUser, role: "ADMIN" as Role };
      vi.mocked(prisma.user.create).mockResolvedValueOnce(adminUser);
      vi.mocked(prisma.auditLog.create).mockResolvedValueOnce({} as never);

      const request = createRequest("http://localhost/api/users", {
        method: "POST",
        body: {
          email: "admin@example.com",
          password: "password123",
          role: "ADMIN",
        },
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.data.role).toBe("ADMIN");
    });

    it("should return 409 when email already exists", async () => {
      vi.mocked(getSession).mockResolvedValueOnce(mockAdminUser);
      vi.mocked(prisma.user.create).mockRejectedValueOnce(
        new Error("Unique constraint failed")
      );

      const request = createRequest("http://localhost/api/users", {
        method: "POST",
        body: { email: "existing@example.com", password: "password123" },
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.error).toBe("Email already exists");
    });
  });

  describe("GET /api/users/[id]", () => {
    it("should return 401 when not authenticated", async () => {
      vi.mocked(getSession).mockResolvedValueOnce(null);

      const request = createRequest("http://localhost/api/users/user-123");
      const response = await getById(request, {
        params: createParams("user-123"),
      });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 404 when user not found", async () => {
      vi.mocked(getSession).mockResolvedValueOnce(mockAdminUser);
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(null);

      const request = createRequest("http://localhost/api/users/nonexistent");
      const response = await getById(request, {
        params: createParams("nonexistent"),
      });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("User not found");
    });

    it("should return user when found", async () => {
      vi.mocked(getSession).mockResolvedValueOnce(mockAdminUser);
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(mockUser);

      const request = createRequest("http://localhost/api/users/user-123");
      const response = await getById(request, {
        params: createParams("user-123"),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.email).toBe("test@example.com");
    });
  });

  describe("PUT /api/users/[id]", () => {
    it("should return 401 when not authenticated", async () => {
      vi.mocked(getSession).mockResolvedValueOnce(null);

      const request = createRequest("http://localhost/api/users/user-123", {
        method: "PUT",
        body: { name: "Updated Name" },
      });
      const response = await PUT(request, {
        params: createParams("user-123"),
      });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 404 when user not found", async () => {
      vi.mocked(getSession).mockResolvedValueOnce(mockAdminUser);
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(null);

      const request = createRequest("http://localhost/api/users/nonexistent", {
        method: "PUT",
        body: { name: "Updated Name" },
      });
      const response = await PUT(request, {
        params: createParams("nonexistent"),
      });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("User not found");
    });

    it("should return 400 for invalid role", async () => {
      vi.mocked(getSession).mockResolvedValueOnce(mockAdminUser);
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(mockUser);

      const request = createRequest("http://localhost/api/users/user-123", {
        method: "PUT",
        body: { role: "INVALID_ROLE" },
      });
      const response = await PUT(request, {
        params: createParams("user-123"),
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid role. Must be ADMIN or VIEWER");
    });

    it("should return 409 when email already exists", async () => {
      vi.mocked(getSession).mockResolvedValueOnce(mockAdminUser);
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(mockUser);
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
        id: "other-user",
        email: "existing@example.com",
      } as never);

      const request = createRequest("http://localhost/api/users/user-123", {
        method: "PUT",
        body: { email: "existing@example.com" },
      });
      const response = await PUT(request, {
        params: createParams("user-123"),
      });
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.error).toBe("Email already exists");
    });

    it("should update user successfully", async () => {
      vi.mocked(getSession).mockResolvedValueOnce(mockAdminUser);
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(mockUser);
      const updatedUser = { ...mockUser, name: "Updated Name" };
      vi.mocked(prisma.user.update).mockResolvedValueOnce(updatedUser);
      vi.mocked(prisma.auditLog.create).mockResolvedValueOnce({} as never);

      const request = createRequest("http://localhost/api/users/user-123", {
        method: "PUT",
        body: { name: "Updated Name" },
      });
      const response = await PUT(request, {
        params: createParams("user-123"),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe("User updated successfully");
      expect(data.data.name).toBe("Updated Name");
    });

    it("should update user role successfully", async () => {
      vi.mocked(getSession).mockResolvedValueOnce(mockAdminUser);
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(mockUser);
      const updatedUser = { ...mockUser, role: "ADMIN" as Role };
      vi.mocked(prisma.user.update).mockResolvedValueOnce(updatedUser);
      vi.mocked(prisma.auditLog.create).mockResolvedValueOnce({} as never);

      const request = createRequest("http://localhost/api/users/user-123", {
        method: "PUT",
        body: { role: "ADMIN" },
      });
      const response = await PUT(request, {
        params: createParams("user-123"),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.role).toBe("ADMIN");
    });
  });

  describe("DELETE /api/users/[id]", () => {
    it("should return 401 when not authenticated", async () => {
      vi.mocked(getSession).mockResolvedValueOnce(null);

      const request = createRequest("http://localhost/api/users/user-123", {
        method: "DELETE",
      });
      const response = await DELETE(request, {
        params: createParams("user-123"),
      });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 400 when trying to delete yourself", async () => {
      vi.mocked(getSession).mockResolvedValueOnce(mockAdminUser);

      const request = createRequest("http://localhost/api/users/admin-123", {
        method: "DELETE",
      });
      const response = await DELETE(request, {
        params: createParams("admin-123"),
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Cannot delete your own account");
    });

    it("should return 404 when user not found", async () => {
      vi.mocked(getSession).mockResolvedValueOnce(mockAdminUser);
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(null);

      const request = createRequest("http://localhost/api/users/nonexistent", {
        method: "DELETE",
      });
      const response = await DELETE(request, {
        params: createParams("nonexistent"),
      });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("User not found");
    });

    it("should delete user successfully", async () => {
      vi.mocked(getSession).mockResolvedValueOnce(mockAdminUser);
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(mockUser);
      vi.mocked(prisma.user.delete).mockResolvedValueOnce(mockUser);
      vi.mocked(prisma.auditLog.create).mockResolvedValueOnce({} as never);

      const request = createRequest("http://localhost/api/users/user-123", {
        method: "DELETE",
      });
      const response = await DELETE(request, {
        params: createParams("user-123"),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe("User deleted successfully");
      expect(prisma.user.delete).toHaveBeenCalledWith({
        where: { id: "user-123" },
      });
    });
  });

  describe("POST /api/users/[id]/reset-password", () => {
    it("should return 401 when not authenticated", async () => {
      vi.mocked(getSession).mockResolvedValueOnce(null);

      const request = createRequest(
        "http://localhost/api/users/user-123/reset-password",
        {
          method: "POST",
          body: { newPassword: "newpassword123" },
        }
      );
      const response = await resetPassword(request, {
        params: createParams("user-123"),
      });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 400 when password is too short", async () => {
      vi.mocked(getSession).mockResolvedValueOnce(mockAdminUser);

      const request = createRequest(
        "http://localhost/api/users/user-123/reset-password",
        {
          method: "POST",
          body: { newPassword: "short" },
        }
      );
      const response = await resetPassword(request, {
        params: createParams("user-123"),
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Password must be at least 6 characters");
    });

    it("should return 400 when password is missing", async () => {
      vi.mocked(getSession).mockResolvedValueOnce(mockAdminUser);

      const request = createRequest(
        "http://localhost/api/users/user-123/reset-password",
        {
          method: "POST",
          body: {},
        }
      );
      const response = await resetPassword(request, {
        params: createParams("user-123"),
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Password must be at least 6 characters");
    });

    it("should return 404 when user not found", async () => {
      vi.mocked(getSession).mockResolvedValueOnce(mockAdminUser);
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(null);

      const request = createRequest(
        "http://localhost/api/users/nonexistent/reset-password",
        {
          method: "POST",
          body: { newPassword: "newpassword123" },
        }
      );
      const response = await resetPassword(request, {
        params: createParams("nonexistent"),
      });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("User not found");
    });

    it("should reset password successfully", async () => {
      vi.mocked(getSession).mockResolvedValueOnce(mockAdminUser);
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(mockUser);
      vi.mocked(prisma.user.update).mockResolvedValueOnce(mockUser);
      vi.mocked(prisma.auditLog.create).mockResolvedValueOnce({} as never);

      const request = createRequest(
        "http://localhost/api/users/user-123/reset-password",
        {
          method: "POST",
          body: { newPassword: "newpassword123" },
        }
      );
      const response = await resetPassword(request, {
        params: createParams("user-123"),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe("Password reset successfully");
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: "user-123" },
        data: { password: "hashed-newpassword123" },
      });
    });
  });
});
