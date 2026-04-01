import { cookies } from "next/headers";
import { prisma } from "./prisma";
import type { Role, Session } from "@prisma/client";

// Session configuration
export const SESSION_CONFIG = {
  // Default session duration (24 hours)
  DEFAULT_DURATION_HOURS: 24,
  // Remember me session duration (30 days)
  REMEMBER_ME_DURATION_DAYS: 30,
  // Session token cookie name
  COOKIE_NAME: "session_token",
  // Cleanup interval for expired sessions (in hours)
  CLEANUP_INTERVAL_HOURS: 1,
};

export interface SessionUser {
  id: string;
  email: string;
  name: string | null;
  role: Role;
  sessionId: string;
}

export interface CreateSessionOptions {
  userId: string;
  userAgent?: string;
  ipAddress?: string;
  rememberMe?: boolean;
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

/**
 * Password strength validation result
 */
export interface PasswordStrengthResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validate password strength
 * Requirements:
 * - Minimum 8 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 * - At least one special character
 */
export function validatePasswordStrength(
  password: string
): PasswordStrengthResult {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push("Password must be at least 8 characters long");
  }

  if (!/[A-Z]/.test(password)) {
    errors.push("Password must contain at least one uppercase letter");
  }

  if (!/[a-z]/.test(password)) {
    errors.push("Password must contain at least one lowercase letter");
  }

  if (!/[0-9]/.test(password)) {
    errors.push("Password must contain at least one number");
  }

  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push("Password must contain at least one special character");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Generate a secure session token
 */
function generateSessionToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Create a new session for a user
 */
export async function createSession(
  options: CreateSessionOptions
): Promise<Session> {
  const token = generateSessionToken();

  // Calculate expiration time based on rememberMe option
  const expiresAt = options.rememberMe
    ? new Date(
        Date.now() +
          SESSION_CONFIG.REMEMBER_ME_DURATION_DAYS * 24 * 60 * 60 * 1000
      )
    : new Date(
        Date.now() + SESSION_CONFIG.DEFAULT_DURATION_HOURS * 60 * 60 * 1000
      );

  // Create session in database
  const session = await prisma.session.create({
    data: {
      token,
      userId: options.userId,
      userAgent: options.userAgent ?? null,
      ipAddress: options.ipAddress ?? null,
      expiresAt,
    },
  });

  // Set cookie
  const cookieStore = await cookies();
  cookieStore.set(SESSION_CONFIG.COOKIE_NAME, token, {
    httpOnly: true,
    secure:
      process.env.NODE_ENV === "production" && process.env.HTTPS === "true",
    sameSite: "lax",
    expires: expiresAt,
    path: "/",
  });

  return session;
}

/**
 * Get the current session from the cookie
 */
export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_CONFIG.COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  // Find session in database
  const session = await prisma.session.findUnique({
    where: { token },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
        },
      },
    },
  });

  if (!session) {
    // Invalid token, clear cookie
    cookieStore.delete(SESSION_CONFIG.COOKIE_NAME);
    return null;
  }

  // Check if session is expired
  if (session.expiresAt < new Date()) {
    // Delete expired session
    await prisma.session.delete({ where: { id: session.id } });
    cookieStore.delete(SESSION_CONFIG.COOKIE_NAME);
    return null;
  }

  // Update last accessed time
  await prisma.session.update({
    where: { id: session.id },
    data: { lastAccessed: new Date() },
  });

  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    role: session.user.role,
    sessionId: session.id,
  };
}

/**
 * Clear the current session
 */
export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_CONFIG.COOKIE_NAME)?.value;

  if (token) {
    // Delete session from database
    await prisma.session.deleteMany({ where: { token } }).catch(() => {
      // Ignore errors if session doesn't exist
    });
  }

  cookieStore.delete(SESSION_CONFIG.COOKIE_NAME);
}

/**
 * Get all active sessions for a user
 */
export async function getUserSessions(userId: string): Promise<
  Array<{
    id: string;
    userAgent: string | null;
    ipAddress: string | null;
    createdAt: Date;
    lastAccessed: Date;
    expiresAt: Date;
    isCurrent: boolean;
  }>
> {
  const cookieStore = await cookies();
  const currentToken = cookieStore.get(SESSION_CONFIG.COOKIE_NAME)?.value;

  // Get all non-expired sessions for the user
  const sessions = await prisma.session.findMany({
    where: {
      userId,
      expiresAt: { gte: new Date() },
    },
    orderBy: { lastAccessed: "desc" },
  });

  return sessions.map((session) => ({
    id: session.id,
    userAgent: session.userAgent,
    ipAddress: session.ipAddress,
    createdAt: session.createdAt,
    lastAccessed: session.lastAccessed,
    expiresAt: session.expiresAt,
    isCurrent: session.token === currentToken,
  }));
}

/**
 * Revoke a specific session
 */
export async function revokeSession(
  sessionId: string,
  userId: string
): Promise<boolean> {
  const cookieStore = await cookies();
  const currentToken = cookieStore.get(SESSION_CONFIG.COOKIE_NAME)?.value;

  // Find the session to revoke
  const session = await prisma.session.findFirst({
    where: { id: sessionId, userId },
  });

  if (!session) {
    return false;
  }

  // Delete the session
  await prisma.session.delete({ where: { id: sessionId } });

  // If revoking current session, also clear the cookie
  if (session.token === currentToken) {
    cookieStore.delete(SESSION_CONFIG.COOKIE_NAME);
  }

  return true;
}

/**
 * Revoke all sessions except the current one
 */
export async function revokeOtherSessions(userId: string): Promise<number> {
  const cookieStore = await cookies();
  const currentToken = cookieStore.get(SESSION_CONFIG.COOKIE_NAME)?.value;

  // Find current session to exclude
  const currentSession = currentToken
    ? await prisma.session.findUnique({ where: { token: currentToken } })
    : null;

  // Delete all other sessions
  const result = await prisma.session.deleteMany({
    where: {
      userId,
      id: currentSession ? { not: currentSession.id } : undefined,
    },
  });

  return result.count;
}

/**
 * Clean up expired sessions (can be called periodically)
 */
export async function cleanupExpiredSessions(): Promise<number> {
  const result = await prisma.session.deleteMany({
    where: {
      expiresAt: { lt: new Date() },
    },
  });

  return result.count;
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
