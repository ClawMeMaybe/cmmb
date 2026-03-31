import { cookies } from "next/headers";
import { prisma } from "./prisma";
import type { Role } from "@prisma/client";

export interface SessionUser {
  id: string;
  email: string;
  name: string | null;
  role: Role;
}

export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  const passwordHash = await hashPassword(password);
  return passwordHash === hash;
}

export async function createSession(userId: string): Promise<string> {
  const sessionId = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  // Store session in database (we'll need a Session model later)
  // For now, we'll use a simple cookie-based session
  const cookieStore = await cookies();
  cookieStore.set("session_user_id", userId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: expiresAt,
  });

  return sessionId;
}

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const userId = cookieStore.get("session_user_id")?.value;

  if (!userId) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
    },
  });

  if (!user) {
    return null;
  }

  return user;
}

export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete("session_user_id");
}

/**
 * Require authentication for server components.
 * Returns the user if authenticated, redirects to login if not.
 * Use this in server components that require authentication.
 */
export async function requireAuth(): Promise<SessionUser> {
  const user = await getSession();

  if (!user) {
    // In a server component, we throw a redirect
    // This is handled by Next.js
    throw new Error("UNAUTHORIZED");
  }

  return user;
}
