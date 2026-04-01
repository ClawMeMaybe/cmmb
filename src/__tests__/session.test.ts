import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock Next.js modules
vi.mock("next/headers", () => ({
  cookies: vi.fn(() =>
    Promise.resolve({
      get: vi.fn(),
      set: vi.fn(),
      delete: vi.fn(),
    })
  ),
}));

// Mock prisma
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

// Mock crypto.subtle for Node.js environment
const mockDigest = vi.fn();
vi.stubGlobal("crypto", {
  subtle: {
    digest: mockDigest,
  },
  getRandomValues: vi.fn((arr: Uint8Array) => {
    for (let i = 0; i < arr.length; i++) {
      arr[i] = Math.floor(Math.random() * 256);
    }
    return arr;
  }),
});

import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import {
  getSession,
  clearSession,
  createSession,
  getUserSessions,
  revokeSession,
  hashPassword,
  verifyPassword,
  SESSION_CONFIG,
} from "@/lib/auth";

describe("Auth session management", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("hashPassword and verifyPassword", () => {
    it("should hash password correctly", async () => {
      // Mock the digest to return a predictable hash
      mockDigest.mockResolvedValueOnce(new Uint8Array([0xab, 0xcd]));

      const hash = await hashPassword("testpassword");
      expect(hash).toBe("abcd");
    });

    it("should verify password correctly", async () => {
      mockDigest.mockResolvedValueOnce(new Uint8Array([0xab, 0xcd]));

      const isValid = await verifyPassword("testpassword", "abcd");
      expect(isValid).toBe(true);
    });

    it("should return false for incorrect password", async () => {
      mockDigest.mockResolvedValueOnce(new Uint8Array([0x12, 0x34]));

      const isValid = await verifyPassword("wrongpassword", "abcd");
      expect(isValid).toBe(false);
    });
  });

  describe("createSession", () => {
    it("should create session with default expiration", async () => {
      const mockSession = {
        id: "session-id",
        token: "test-token",
        userId: "user-id",
        userAgent: null,
        ipAddress: null,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        createdAt: new Date(),
        lastAccessed: new Date(),
      };

      const mockSet = vi.fn();
      vi.mocked(cookies).mockResolvedValueOnce({
        get: vi.fn(),
        set: mockSet,
        delete: vi.fn(),
      } as unknown as Awaited<ReturnType<typeof cookies>>);

      vi.mocked(prisma.session.create).mockResolvedValueOnce(mockSession);

      const session = await createSession({ userId: "user-id" });

      expect(session).toEqual(mockSession);
      expect(prisma.session.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: "user-id",
          }),
        })
      );
      expect(mockSet).toHaveBeenCalledWith(
        SESSION_CONFIG.COOKIE_NAME,
        expect.any(String),
        expect.objectContaining({
          httpOnly: true,
        })
      );
    });

    it("should create session with rememberMe expiration (30 days)", async () => {
      const mockSession = {
        id: "session-id",
        token: "test-token",
        userId: "user-id",
        userAgent: null,
        ipAddress: null,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        createdAt: new Date(),
        lastAccessed: new Date(),
      };

      vi.mocked(cookies).mockResolvedValueOnce({
        get: vi.fn(),
        set: vi.fn(),
        delete: vi.fn(),
      } as unknown as Awaited<ReturnType<typeof cookies>>);

      vi.mocked(prisma.session.create).mockResolvedValueOnce(mockSession);

      await createSession({ userId: "user-id", rememberMe: true });

      expect(prisma.session.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: "user-id",
            expiresAt: expect.any(Date),
          }),
        })
      );

      // Verify expiration is approximately 30 days
      const createCall = vi.mocked(prisma.session.create).mock.calls[0][0];
      const expiresAt = createCall.data.expiresAt as Date;
      const expectedExpiry =
        Date.now() +
        SESSION_CONFIG.REMEMBER_ME_DURATION_DAYS * 24 * 60 * 60 * 1000;
      // Allow 1 second tolerance
      expect(Math.abs(expiresAt.getTime() - expectedExpiry)).toBeLessThan(1000);
    });
  });

  describe("getSession", () => {
    it("should return null when no session cookie exists", async () => {
      vi.mocked(cookies).mockResolvedValueOnce({
        get: vi.fn().mockReturnValue(undefined),
        set: vi.fn(),
        delete: vi.fn(),
      } as unknown as Awaited<ReturnType<typeof cookies>>);

      const session = await getSession();

      expect(session).toBeNull();
    });

    it("should return null when session not found in database", async () => {
      vi.mocked(cookies).mockResolvedValueOnce({
        get: vi.fn().mockReturnValue({ value: "test-token" }),
        set: vi.fn(),
        delete: vi.fn(),
      } as unknown as Awaited<ReturnType<typeof cookies>>);

      vi.mocked(prisma.session.findUnique).mockResolvedValueOnce(null);

      const session = await getSession();

      expect(session).toBeNull();
    });

    it("should return null when session is expired", async () => {
      const mockDelete = vi.fn();
      vi.mocked(cookies).mockResolvedValueOnce({
        get: vi.fn().mockReturnValue({ value: "test-token" }),
        set: vi.fn(),
        delete: mockDelete,
      } as unknown as Awaited<ReturnType<typeof cookies>>);

      vi.mocked(prisma.session.findUnique).mockResolvedValueOnce({
        id: "session-id",
        token: "test-token",
        userId: "user-id",
        userAgent: null,
        ipAddress: null,
        expiresAt: new Date(Date.now() - 1000), // Expired
        createdAt: new Date(),
        lastAccessed: new Date(),
        user: {
          id: "user-id",
          email: "admin@example.com",
          name: "Admin",
          role: "ADMIN",
        },
      } as unknown as Awaited<ReturnType<typeof prisma.session.findUnique>>);

      vi.mocked(prisma.session.delete).mockResolvedValueOnce({} as never);

      const session = await getSession();

      expect(session).toBeNull();
      expect(mockDelete).toHaveBeenCalledWith(SESSION_CONFIG.COOKIE_NAME);
    });

    it("should return user when session is valid", async () => {
      const mockUser = {
        id: "user-id",
        email: "admin@example.com",
        name: "Admin",
        role: "ADMIN" as const,
      };

      vi.mocked(cookies).mockResolvedValueOnce({
        get: vi.fn().mockReturnValue({ value: "test-token" }),
        set: vi.fn(),
        delete: vi.fn(),
      } as unknown as Awaited<ReturnType<typeof cookies>>);

      vi.mocked(prisma.session.findUnique).mockResolvedValueOnce({
        id: "session-id",
        token: "test-token",
        userId: "user-id",
        userAgent: null,
        ipAddress: null,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        createdAt: new Date(),
        lastAccessed: new Date(),
        user: mockUser,
      } as unknown as Awaited<ReturnType<typeof prisma.session.findUnique>>);

      vi.mocked(prisma.session.update).mockResolvedValueOnce({} as never);

      const session = await getSession();

      expect(session).toEqual({
        ...mockUser,
        sessionId: "session-id",
      });
      expect(prisma.session.update).toHaveBeenCalledWith({
        where: { id: "session-id" },
        data: { lastAccessed: expect.any(Date) },
      });
    });
  });

  describe("clearSession", () => {
    it("should delete session from database and cookie", async () => {
      const mockDelete = vi.fn();
      vi.mocked(cookies).mockResolvedValueOnce({
        get: vi.fn().mockReturnValue({ value: "test-token" }),
        set: vi.fn(),
        delete: mockDelete,
      } as unknown as Awaited<ReturnType<typeof cookies>>);

      vi.mocked(prisma.session.deleteMany).mockResolvedValueOnce({ count: 1 });

      await clearSession();

      expect(prisma.session.deleteMany).toHaveBeenCalledWith({
        where: { token: "test-token" },
      });
      expect(mockDelete).toHaveBeenCalledWith(SESSION_CONFIG.COOKIE_NAME);
    });

    it("should handle case when no session token exists", async () => {
      const mockDelete = vi.fn();
      vi.mocked(cookies).mockResolvedValueOnce({
        get: vi.fn().mockReturnValue(undefined),
        set: vi.fn(),
        delete: mockDelete,
      } as unknown as Awaited<ReturnType<typeof cookies>>);

      await clearSession();

      expect(mockDelete).toHaveBeenCalledWith(SESSION_CONFIG.COOKIE_NAME);
    });
  });

  describe("getUserSessions", () => {
    it("should return all active sessions for user", async () => {
      vi.mocked(cookies).mockResolvedValueOnce({
        get: vi.fn().mockReturnValue({ value: "current-token" }),
        set: vi.fn(),
        delete: vi.fn(),
      } as unknown as Awaited<ReturnType<typeof cookies>>);

      vi.mocked(prisma.session.findMany).mockResolvedValueOnce([
        {
          id: "session-1",
          token: "current-token",
          userId: "user-id",
          userAgent: "Chrome",
          ipAddress: "127.0.0.1",
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          createdAt: new Date(),
          lastAccessed: new Date(),
        },
        {
          id: "session-2",
          token: "other-token",
          userId: "user-id",
          userAgent: "Firefox",
          ipAddress: "192.168.1.1",
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          createdAt: new Date(),
          lastAccessed: new Date(),
        },
      ]);

      const sessions = await getUserSessions("user-id");

      expect(sessions).toHaveLength(2);
      expect(sessions[0].isCurrent).toBe(true);
      expect(sessions[1].isCurrent).toBe(false);
    });
  });

  describe("revokeSession", () => {
    it("should return false when session not found", async () => {
      vi.mocked(cookies).mockResolvedValueOnce({
        get: vi.fn().mockReturnValue({ value: "current-token" }),
        set: vi.fn(),
        delete: vi.fn(),
      } as unknown as Awaited<ReturnType<typeof cookies>>);

      vi.mocked(prisma.session.findFirst).mockResolvedValueOnce(null);

      const result = await revokeSession("non-existent", "user-id");

      expect(result).toBe(false);
    });

    it("should revoke session and return true", async () => {
      vi.mocked(cookies).mockResolvedValueOnce({
        get: vi.fn().mockReturnValue({ value: "other-token" }),
        set: vi.fn(),
        delete: vi.fn(),
      } as unknown as Awaited<ReturnType<typeof cookies>>);

      vi.mocked(prisma.session.findFirst).mockResolvedValueOnce({
        id: "session-to-revoke",
        token: "revoked-token",
        userId: "user-id",
        userAgent: null,
        ipAddress: null,
        expiresAt: new Date(),
        createdAt: new Date(),
        lastAccessed: new Date(),
      });

      vi.mocked(prisma.session.delete).mockResolvedValueOnce({} as never);

      const result = await revokeSession("session-to-revoke", "user-id");

      expect(result).toBe(true);
      expect(prisma.session.delete).toHaveBeenCalledWith({
        where: { id: "session-to-revoke" },
      });
    });

    it("should clear cookie when revoking current session", async () => {
      const mockDelete = vi.fn();
      vi.mocked(cookies).mockResolvedValueOnce({
        get: vi.fn().mockReturnValue({ value: "current-token" }),
        set: vi.fn(),
        delete: mockDelete,
      } as unknown as Awaited<ReturnType<typeof cookies>>);

      vi.mocked(prisma.session.findFirst).mockResolvedValueOnce({
        id: "current-session",
        token: "current-token",
        userId: "user-id",
        userAgent: null,
        ipAddress: null,
        expiresAt: new Date(),
        createdAt: new Date(),
        lastAccessed: new Date(),
      });

      vi.mocked(prisma.session.delete).mockResolvedValueOnce({} as never);

      const result = await revokeSession("current-session", "user-id");

      expect(result).toBe(true);
      expect(mockDelete).toHaveBeenCalledWith(SESSION_CONFIG.COOKIE_NAME);
    });
  });
});
