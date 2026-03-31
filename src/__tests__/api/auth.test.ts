import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST as loginPost } from "@/app/api/auth/login/route";
import { POST as logoutPost } from "@/app/api/auth/logout/route";
import { GET as meGet } from "@/app/api/auth/me/route";

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
    },
  },
}));

vi.mock("@/lib/auth", () => ({
  verifyPassword: vi.fn(),
  createSession: vi.fn(),
  getSession: vi.fn(),
  clearSession: vi.fn(),
}));

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  verifyPassword,
  createSession,
  getSession,
  clearSession,
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

      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(mockUser);
      vi.mocked(verifyPassword).mockResolvedValueOnce(true);
      vi.mocked(createSession).mockResolvedValueOnce("session-id");

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
    });
  });

  describe("POST /api/auth/logout", () => {
    it("should clear session and return success", async () => {
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
      });

      const response = await meGet();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.user.email).toBe("admin@clawmemaybe.com");
    });
  });
});
