import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST as loginPost } from "@/app/api/auth/login/route";
import { POST as logoutPost } from "@/app/api/auth/logout/route";
import { GET as meGet } from "@/app/api/auth/me/route";
import { GET as sessionsGet } from "@/app/api/auth/sessions/route";
import { DELETE as sessionDelete } from "@/app/api/auth/sessions/[id]/route";

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
    },
    session: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("@/lib/auth", () => ({
  verifyPassword: vi.fn(),
  createSession: vi.fn(),
  getSession: vi.fn(),
  clearSession: vi.fn(),
  getUserSessions: vi.fn(),
  revokeSession: vi.fn(),
  SESSION_CONFIG: {
    COOKIE_NAME: "session_token",
  },
}));

vi.mock("@/lib/audit", () => ({
  createAuditLog: vi.fn().mockResolvedValue({}),
  AuditActions: {
    LOGIN: "LOGIN",
    LOGOUT: "LOGOUT",
    LOGIN_FAILED: "LOGIN_FAILED",
    SESSION_REVOKED: "SESSION_REVOKED",
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
  createSession,
  getSession,
  clearSession,
  getUserSessions,
  revokeSession,
} from "@/lib/auth";

function createRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("Auth API endpoints", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("POST /api/auth/login", () => {
    it("should return 400 when email is missing", async () => {
      const request = createRequest({ password: "password" });
      const response = await loginPost(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Email and password are required");
    });

    it("should return 400 when password is missing", async () => {
      const request = createRequest({ email: "test@example.com" });
      const response = await loginPost(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Email and password are required");
    });

    it("should return 401 when user not found", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(null);

      const request = createRequest({
        email: "nonexistent@example.com",
        password: "password",
      });
      const response = await loginPost(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Invalid credentials");
    });

    it("should return 401 when password is incorrect", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
        id: "user-id",
        email: "test@example.com",
        password: "hashedpassword",
        name: "Test",
        role: "ADMIN",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      vi.mocked(verifyPassword).mockResolvedValueOnce(false);

      const request = createRequest({
        email: "test@example.com",
        password: "wrongpassword",
      });
      const response = await loginPost(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Invalid credentials");
    });

    it("should return 200 with user data on successful login", async () => {
      const mockUser = {
        id: "user-id",
        email: "admin@clawmemaybe.com",
        password: "hashedpassword",
        name: "Admin",
        role: "ADMIN" as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockSession = {
        id: "session-id",
        token: "session-token",
        userId: "user-id",
        userAgent: "test-agent",
        ipAddress: "127.0.0.1",
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        createdAt: new Date(),
        lastAccessed: new Date(),
      };

      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(mockUser);
      vi.mocked(verifyPassword).mockResolvedValueOnce(true);
      vi.mocked(createSession).mockResolvedValueOnce(mockSession);

      const request = createRequest({
        email: "admin@clawmemaybe.com",
        password: "correctpassword",
      });
      const response = await loginPost(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe("Login successful");
      expect(data.data.user.email).toBe("admin@clawmemaybe.com");
      expect(data.data.user).not.toHaveProperty("password");
      expect(data.data.sessionExpiresAt).toBeDefined();
    });

    it("should pass rememberMe option to createSession", async () => {
      const mockUser = {
        id: "user-id",
        email: "admin@clawmemaybe.com",
        password: "hashedpassword",
        name: "Admin",
        role: "ADMIN" as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockSession = {
        id: "session-id",
        token: "session-token",
        userId: "user-id",
        userAgent: "test-agent",
        ipAddress: "127.0.0.1",
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        createdAt: new Date(),
        lastAccessed: new Date(),
      };

      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(mockUser);
      vi.mocked(verifyPassword).mockResolvedValueOnce(true);
      vi.mocked(createSession).mockResolvedValueOnce(mockSession);

      const request = createRequest({
        email: "admin@clawmemaybe.com",
        password: "correctpassword",
        rememberMe: true,
      });
      const response = await loginPost(request);

      expect(response.status).toBe(200);
      expect(createSession).toHaveBeenCalledWith(
        expect.objectContaining({ rememberMe: true })
      );
    });
  });

  describe("POST /api/auth/logout", () => {
    it("should clear session and return success", async () => {
      vi.mocked(getSession).mockResolvedValueOnce({
        id: "user-id",
        email: "admin@clawmemaybe.com",
        name: "Admin",
        role: "ADMIN",
        sessionId: "session-id",
      });
      vi.mocked(clearSession).mockResolvedValueOnce();

      const response = await logoutPost();
      const data = await response.json();

      expect(clearSession).toHaveBeenCalled();
      expect(response.status).toBe(200);
      expect(data.message).toBe("Logged out successfully");
    });

    it("should handle logout when not logged in", async () => {
      vi.mocked(getSession).mockResolvedValueOnce(null);
      vi.mocked(clearSession).mockResolvedValueOnce();

      const response = await logoutPost();
      const data = await response.json();

      expect(clearSession).toHaveBeenCalled();
      expect(response.status).toBe(200);
      expect(data.message).toBe("Logged out successfully");
    });
  });

  describe("GET /api/auth/me", () => {
    it("should return 401 when not authenticated", async () => {
      vi.mocked(getSession).mockResolvedValueOnce(null);

      const response = await meGet();
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return user data when authenticated", async () => {
      vi.mocked(getSession).mockResolvedValueOnce({
        id: "user-id",
        email: "admin@clawmemaybe.com",
        name: "Admin",
        role: "ADMIN",
        sessionId: "session-id",
      });

      const response = await meGet();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.user.email).toBe("admin@clawmemaybe.com");
      expect(data.data.user.sessionId).toBe("session-id");
    });
  });

  describe("GET /api/auth/sessions", () => {
    it("should return 401 when not authenticated", async () => {
      vi.mocked(getSession).mockResolvedValueOnce(null);

      const response = await sessionsGet();
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return sessions list when authenticated", async () => {
      vi.mocked(getSession).mockResolvedValueOnce({
        id: "user-id",
        email: "admin@clawmemaybe.com",
        name: "Admin",
        role: "ADMIN",
        sessionId: "session-id",
      });

      vi.mocked(getUserSessions).mockResolvedValueOnce([
        {
          id: "session-id",
          userAgent: "Chrome",
          ipAddress: "127.0.0.1",
          createdAt: new Date(),
          lastAccessed: new Date(),
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          isCurrent: true,
        },
        {
          id: "other-session-id",
          userAgent: "Firefox",
          ipAddress: "192.168.1.1",
          createdAt: new Date(),
          lastAccessed: new Date(),
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          isCurrent: false,
        },
      ]);

      const response = await sessionsGet();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.sessions).toHaveLength(2);
      expect(data.data.sessions[0].isCurrent).toBe(true);
      expect(data.data.sessions[1].isCurrent).toBe(false);
    });
  });

  describe("DELETE /api/auth/sessions/[id]", () => {
    it("should return 401 when not authenticated", async () => {
      vi.mocked(getSession).mockResolvedValueOnce(null);

      const response = await sessionDelete(new Request("http://localhost"), {
        params: Promise.resolve({ id: "session-id" }),
      });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 404 when session not found", async () => {
      vi.mocked(getSession).mockResolvedValueOnce({
        id: "user-id",
        email: "admin@clawmemaybe.com",
        name: "Admin",
        role: "ADMIN",
        sessionId: "current-session-id",
      });

      vi.mocked(revokeSession).mockResolvedValueOnce(false);

      const response = await sessionDelete(new Request("http://localhost"), {
        params: Promise.resolve({ id: "non-existent-session" }),
      });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Session not found or not owned by user");
    });

    it("should revoke session successfully", async () => {
      vi.mocked(getSession).mockResolvedValueOnce({
        id: "user-id",
        email: "admin@clawmemaybe.com",
        name: "Admin",
        role: "ADMIN",
        sessionId: "current-session-id",
      });

      vi.mocked(revokeSession).mockResolvedValueOnce(true);

      const response = await sessionDelete(new Request("http://localhost"), {
        params: Promise.resolve({ id: "session-to-revoke" }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.revoked).toBe(true);
      expect(data.message).toBe("Session revoked successfully");
      expect(revokeSession).toHaveBeenCalledWith(
        "session-to-revoke",
        "user-id"
      );
    });
  });
});
