import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword, createSession } from "@/lib/auth";
import { createAuditLog, AuditActions, EntityTypes } from "@/lib/audit";
import type { ApiResponse } from "@/types";

// Define a safe user type for API responses (without password)
type SafeUser = {
  id: string;
  email: string;
  name: string | null;
  role: "ADMIN" | "VIEWER";
  createdAt: Date;
  updatedAt: Date;
};

export async function POST(
  request: NextRequest
): Promise<NextResponse<ApiResponse<{ user: SafeUser }>>> {
  try {
    const body = await request.json();
    const { email, password } = body;

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

    await createSession(user.id);

    // Log successful login
    await createAuditLog({
      action: AuditActions.LOGIN,
      entityType: EntityTypes.SESSION,
      entityId: user.id,
      userId: user.id,
      details: { email, loginMethod: "password" },
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
