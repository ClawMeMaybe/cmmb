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
  },
}));

// Mock crypto.subtle for Node.js environment
const mockDigest = vi.fn();
vi.stubGlobal("crypto", {
  subtle: {
    digest: mockDigest,
  },
});

import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getSession, clearSession } from "@/lib/auth";

describe("Auth session management", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

    it("should return null when user not found", async () => {
      vi.mocked(cookies).mockResolvedValueOnce({
        get: vi.fn().mockReturnValue({ value: "non-existent-id" }),
        set: vi.fn(),
        delete: vi.fn(),
      } as unknown as Awaited<ReturnType<typeof cookies>>);

      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(null);

      const session = await getSession();

      expect(session).toBeNull();
    });

    it("should return user when session is valid", async () => {
      const mockUser = {
        id: "user-id",
        email: "admin@example.com",
        name: "Admin",
        role: "ADMIN" as const,
      };

      vi.mocked(cookies).mockResolvedValueOnce({
        get: vi.fn().mockReturnValue({ value: mockUser.id }),
        set: vi.fn(),
        delete: vi.fn(),
      } as unknown as Awaited<ReturnType<typeof cookies>>);

      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(
        mockUser as unknown as Awaited<
          ReturnType<typeof prisma.user.findUnique>
        >
      );

      const session = await getSession();

      expect(session).toEqual(mockUser);
    });
  });

  describe("clearSession", () => {
    it("should delete the session cookie", async () => {
      const mockDelete = vi.fn();
      vi.mocked(cookies).mockResolvedValueOnce({
        get: vi.fn(),
        set: vi.fn(),
        delete: mockDelete,
      } as unknown as Awaited<ReturnType<typeof cookies>>);

      await clearSession();

      expect(mockDelete).toHaveBeenCalledWith("session_user_id");
    });
  });
});
