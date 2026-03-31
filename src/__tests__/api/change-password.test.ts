import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST as changePasswordPost } from "@/app/api/auth/change-password/route";

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
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("@/lib/auth", () => ({
  verifyPassword: vi.fn(),
  hashPassword: vi.fn(),
  getSession: vi.fn(),
}));

vi.mock("@/lib/audit", () => ({
  createAuditLog: vi.fn().mockResolvedValue(undefined),
  AuditActions: {
    LOGIN: "LOGIN",
    LOGOUT: "LOGOUT",
    LOGIN_FAILED: "LOGIN_FAILED",
    CREATE_INSTANCE: "CREATE_INSTANCE",
    UPDATE_INSTANCE: "UPDATE_INSTANCE",
    DELETE_INSTANCE: "DELETE_INSTANCE",
    START_INSTANCE: "START_INSTANCE",
    STOP_INSTANCE: "STOP_INSTANCE",
    RESTART_INSTANCE: "RESTART_INSTANCE",
    CREATE_USER: "CREATE_USER",
    UPDATE_USER: "UPDATE_USER",
    DELETE_USER: "DELETE_USER",
    PASSWORD_CHANGE: "PASSWORD_CHANGE",
    PASSWORD_CHANGE_FAILED: "PASSWORD_CHANGE_FAILED",
  },
  EntityTypes: {
    USER: "User",
    INSTANCE: "Instance",
    SESSION: "Session",
  },
}));

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword, hashPassword, getSession } from "@/lib/auth";

function createRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/auth/change-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("Change Password API endpoint", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("POST /api/auth/change-password", () => {
    it("should return 401 when not authenticated", async () => {
      vi.mocked(getSession).mockResolvedValueOnce(null);

      const request = createRequest({
        currentPassword: "oldpassword",
        newPassword: "newpassword123",
      });
      const response = await changePasswordPost(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 400 when currentPassword is missing", async () => {
      vi.mocked(getSession).mockResolvedValueOnce({
        id: "user-id",
        email: "test@example.com",
        name: "Test",
        role: "ADMIN",
      });

      const request = createRequest({
        newPassword: "newpassword123",
      });
      const response = await changePasswordPost(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Current password and new password are required");
    });

    it("should return 400 when newPassword is missing", async () => {
      vi.mocked(getSession).mockResolvedValueOnce({
        id: "user-id",
        email: "test@example.com",
        name: "Test",
        role: "ADMIN",
      });

      const request = createRequest({
        currentPassword: "oldpassword",
      });
      const response = await changePasswordPost(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Current password and new password are required");
    });

    it("should return 400 when newPassword is less than 8 characters", async () => {
      vi.mocked(getSession).mockResolvedValueOnce({
        id: "user-id",
        email: "test@example.com",
        name: "Test",
        role: "ADMIN",
      });

      const request = createRequest({
        currentPassword: "oldpassword",
        newPassword: "short",
      });
      const response = await changePasswordPost(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Password must be at least 8 characters");
    });

    it("should return 400 when current password is incorrect", async () => {
      vi.mocked(getSession).mockResolvedValueOnce({
        id: "user-id",
        email: "test@example.com",
        name: "Test",
        role: "ADMIN",
      });

      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
        id: "user-id",
        email: "test@example.com",
        password: "hashedpassword",
      });

      vi.mocked(verifyPassword).mockResolvedValueOnce(false);

      const request = createRequest({
        currentPassword: "wrongpassword",
        newPassword: "newpassword123",
      });
      const response = await changePasswordPost(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Current password is incorrect");
    });

    it("should return 400 when new password is same as current", async () => {
      vi.mocked(getSession).mockResolvedValueOnce({
        id: "user-id",
        email: "test@example.com",
        name: "Test",
        role: "ADMIN",
      });

      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
        id: "user-id",
        email: "test@example.com",
        password: "hashedpassword",
      });

      vi.mocked(verifyPassword)
        .mockResolvedValueOnce(true) // current password check
        .mockResolvedValueOnce(true); // same password check

      const request = createRequest({
        currentPassword: "oldpassword",
        newPassword: "oldpassword",
      });
      const response = await changePasswordPost(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe(
        "New password must be different from current password"
      );
    });

    it("should return 200 on successful password change", async () => {
      vi.mocked(getSession).mockResolvedValueOnce({
        id: "user-id",
        email: "test@example.com",
        name: "Test",
        role: "ADMIN",
      });

      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
        id: "user-id",
        email: "test@example.com",
        password: "oldhashedpassword",
      });

      vi.mocked(verifyPassword)
        .mockResolvedValueOnce(true) // current password check
        .mockResolvedValueOnce(false); // same password check

      vi.mocked(hashPassword).mockResolvedValueOnce("newhashedpassword");
      vi.mocked(prisma.user.update).mockResolvedValueOnce({
        id: "user-id",
        email: "test@example.com",
        password: "newhashedpassword",
        name: "Test",
        role: "ADMIN",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const request = createRequest({
        currentPassword: "oldpassword123",
        newPassword: "newpassword123",
      });
      const response = await changePasswordPost(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe("Password changed successfully");
      expect(data.data.success).toBe(true);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: "user-id" },
        data: { password: "newhashedpassword" },
      });
    });
  });
});
