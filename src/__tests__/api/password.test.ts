import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST as passwordPost } from "@/app/api/auth/password/route";

// Mock dependencies
vi.mock("next/headers", () => ({
  cookies: vi.fn(() =>
    Promise.resolve({
      get: vi.fn().mockReturnValue({ value: "test-session-token" }),
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
  validatePasswordStrength: vi.fn(),
  getSession: vi.fn(),
}));

vi.mock("@/lib/audit", () => ({
  createAuditLog: vi.fn().mockResolvedValue({}),
  AuditActions: {
    LOGIN: "LOGIN",
    LOGOUT: "LOGOUT",
    LOGIN_FAILED: "LOGIN_FAILED",
    PASSWORD_CHANGED: "PASSWORD_CHANGED",
    PASSWORD_CHANGE_FAILED: "PASSWORD_CHANGE_FAILED",
  },
  EntityTypes: {
    USER: "User",
    SESSION: "Session",
  },
}));

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  verifyPassword,
  hashPassword,
  validatePasswordStrength,
  getSession,
} from "@/lib/auth";

function createRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/auth/password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("Password Change API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("POST /api/auth/password", () => {
    it("should return 401 when not authenticated", async () => {
      vi.mocked(getSession).mockResolvedValueOnce(null);

      const request = createRequest({
        currentPassword: "oldpassword",
        newPassword: "newpassword",
      });
      const response = await passwordPost(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 400 when current password is missing", async () => {
      vi.mocked(getSession).mockResolvedValueOnce({
        id: "user-id",
        email: "admin@clawmemaybe.com",
        name: "Admin",
        role: "ADMIN",
        sessionId: "session-id",
      });

      const request = createRequest({
        newPassword: "newpassword",
      });
      const response = await passwordPost(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Current password and new password are required");
    });

    it("should return 400 when new password is missing", async () => {
      vi.mocked(getSession).mockResolvedValueOnce({
        id: "user-id",
        email: "admin@clawmemaybe.com",
        name: "Admin",
        role: "ADMIN",
        sessionId: "session-id",
      });

      const request = createRequest({
        currentPassword: "oldpassword",
      });
      const response = await passwordPost(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Current password and new password are required");
    });

    it("should return 404 when user not found", async () => {
      vi.mocked(getSession).mockResolvedValueOnce({
        id: "user-id",
        email: "admin@clawmemaybe.com",
        name: "Admin",
        role: "ADMIN",
        sessionId: "session-id",
      });

      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(null);

      const request = createRequest({
        currentPassword: "oldpassword",
        newPassword: "newpassword",
      });
      const response = await passwordPost(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("User not found");
    });

    it("should return 400 when current password is incorrect", async () => {
      vi.mocked(getSession).mockResolvedValueOnce({
        id: "user-id",
        email: "admin@clawmemaybe.com",
        name: "Admin",
        role: "ADMIN",
        sessionId: "session-id",
      });

      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
        id: "user-id",
        email: "admin@clawmemaybe.com",
        password: "hashedpassword",
        name: "Admin",
        role: "ADMIN",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      vi.mocked(verifyPassword).mockResolvedValueOnce(false);

      const request = createRequest({
        currentPassword: "wrongpassword",
        newPassword: "newpassword",
      });
      const response = await passwordPost(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Current password is incorrect");
    });

    it("should return 400 when password does not meet strength requirements", async () => {
      vi.mocked(getSession).mockResolvedValueOnce({
        id: "user-id",
        email: "admin@clawmemaybe.com",
        name: "Admin",
        role: "ADMIN",
        sessionId: "session-id",
      });

      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
        id: "user-id",
        email: "admin@clawmemaybe.com",
        password: "hashedpassword",
        name: "Admin",
        role: "ADMIN",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      vi.mocked(verifyPassword).mockResolvedValueOnce(true);
      vi.mocked(validatePasswordStrength).mockReturnValueOnce({
        valid: false,
        errors: ["Password must be at least 8 characters long"],
      });

      const request = createRequest({
        currentPassword: "oldpassword",
        newPassword: "weak",
      });
      const response = await passwordPost(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Password does not meet strength requirements");
      expect(data.details).toContain(
        "Password must be at least 8 characters long"
      );
    });

    it("should return 400 when new password is same as current", async () => {
      vi.mocked(getSession).mockResolvedValueOnce({
        id: "user-id",
        email: "admin@clawmemaybe.com",
        name: "Admin",
        role: "ADMIN",
        sessionId: "session-id",
      });

      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
        id: "user-id",
        email: "admin@clawmemaybe.com",
        password: "hashedpassword",
        name: "Admin",
        role: "ADMIN",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      vi.mocked(verifyPassword)
        .mockResolvedValueOnce(true) // current password check
        .mockResolvedValueOnce(true); // same password check

      vi.mocked(validatePasswordStrength).mockReturnValueOnce({
        valid: true,
        errors: [],
      });

      const request = createRequest({
        currentPassword: "oldpassword",
        newPassword: "oldpassword",
      });
      const response = await passwordPost(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe(
        "New password must be different from current password"
      );
    });

    it("should change password successfully", async () => {
      vi.mocked(getSession).mockResolvedValueOnce({
        id: "user-id",
        email: "admin@clawmemaybe.com",
        name: "Admin",
        role: "ADMIN",
        sessionId: "session-id",
      });

      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
        id: "user-id",
        email: "admin@clawmemaybe.com",
        password: "oldhashedpassword",
        name: "Admin",
        role: "ADMIN",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      vi.mocked(verifyPassword)
        .mockResolvedValueOnce(true) // current password check
        .mockResolvedValueOnce(false); // same password check (different)

      vi.mocked(validatePasswordStrength).mockReturnValueOnce({
        valid: true,
        errors: [],
      });

      vi.mocked(hashPassword).mockResolvedValueOnce("newhashedpassword");

      vi.mocked(prisma.user.update).mockResolvedValueOnce({
        id: "user-id",
        email: "admin@clawmemaybe.com",
        password: "newhashedpassword",
        name: "Admin",
        role: "ADMIN",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const request = createRequest({
        currentPassword: "oldpassword",
        newPassword: "NewStrongPassword123!",
      });
      const response = await passwordPost(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.success).toBe(true);
      expect(data.message).toBe("Password changed successfully");
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: "user-id" },
        data: { password: "newhashedpassword" },
      });
    });

    it("should log audit event on successful password change", async () => {
      vi.mocked(getSession).mockResolvedValueOnce({
        id: "user-id",
        email: "admin@clawmemaybe.com",
        name: "Admin",
        role: "ADMIN",
        sessionId: "session-id",
      });

      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
        id: "user-id",
        email: "admin@clawmemaybe.com",
        password: "oldhashedpassword",
        name: "Admin",
        role: "ADMIN",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      vi.mocked(verifyPassword)
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false);

      vi.mocked(validatePasswordStrength).mockReturnValueOnce({
        valid: true,
        errors: [],
      });

      vi.mocked(hashPassword).mockResolvedValueOnce("newhashedpassword");

      vi.mocked(prisma.user.update).mockResolvedValueOnce({
        id: "user-id",
        email: "admin@clawmemaybe.com",
        password: "newhashedpassword",
        name: "Admin",
        role: "ADMIN",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const { createAuditLog, AuditActions, EntityTypes } =
        await import("@/lib/audit");

      const request = createRequest({
        currentPassword: "oldpassword",
        newPassword: "NewStrongPassword123!",
      });
      await passwordPost(request);

      expect(createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: AuditActions.PASSWORD_CHANGED,
          entityType: EntityTypes.USER,
          entityId: "user-id",
          userId: "user-id",
        })
      );
    });
  });
});
