import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword, createSession } from "@/lib/auth";
import { createAuditLog, AuditActions, EntityTypes } from "@/lib/audit";
import type { ApiResponse } from "@/types";

/**
 * @openapi
 * /auth/login:
 *   post:
 *     summary: Admin login
 *     description: Authenticate an admin user and create a session
 *     tags:
 *       - Authentication
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       '200':
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/LoginResponse'
 *                 message:
 *                   type: string
 *                   example: "Login successful"
 *       '400':
 *         description: Missing required fields
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       '401':
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       '500':
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

// Define a safe user type for API responses (without password)
type SafeUser = {
  id: string;
  email: string;
  name: string | null;
  role: "ADMIN" | "VIEWER";
  createdAt: Date;
  updatedAt: Date;
};

type LoginResponse = {
  user: SafeUser;
  sessionExpiresAt: string;
};

export async function POST(
  request: NextRequest
): Promise<NextResponse<ApiResponse<LoginResponse>>> {
  try {
    const body = await request.json();
    const { email, password, rememberMe } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Log failed login attempt
      await createAuditLog({
        action: AuditActions.LOGIN_FAILED,
        entityType: EntityTypes.USER,
        entityId: "unknown",
        userId: "unknown",
        details: { email, reason: "user_not_found" },
      }).catch(console.error);

      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    const isValid = await verifyPassword(password, user.password);

    if (!isValid) {
      // Log failed login attempt
      await createAuditLog({
        action: AuditActions.LOGIN_FAILED,
        entityType: EntityTypes.USER,
        entityId: user.id,
        userId: user.id,
        details: { email, reason: "invalid_password" },
      }).catch(console.error);

      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    // Create session with device info
    const userAgent = request.headers.get("user-agent") ?? undefined;
    const ipAddress =
      request.headers.get("x-forwarded-for")?.split(",")[0] ?? undefined;

    const session = await createSession({
      userId: user.id,
      userAgent,
      ipAddress,
      rememberMe: Boolean(rememberMe),
    });

    // Log successful login
    await createAuditLog({
      action: AuditActions.LOGIN,
      entityType: EntityTypes.SESSION,
      entityId: session.id,
      userId: user.id,
      details: {
        email,
        loginMethod: "password",
        rememberMe: Boolean(rememberMe),
        userAgent,
        ipAddress,
      },
    }).catch(console.error);

    return NextResponse.json({
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
        sessionExpiresAt: session.expiresAt.toISOString(),
      },
      message: "Login successful",
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
