import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getSession,
  verifyPassword,
  hashPassword,
  validatePasswordStrength,
} from "@/lib/auth";
import { createAuditLog, AuditActions, EntityTypes } from "@/lib/audit";
import type { ApiResponse } from "@/types";

type PasswordChangeResponse = {
  success: boolean;
};

export async function POST(
  request: NextRequest
): Promise<NextResponse<ApiResponse<PasswordChangeResponse>>> {
  try {
    // Check if user is authenticated
    const user = await getSession();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { currentPassword, newPassword } = body;

    // Validate required fields
    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: "Current password and new password are required" },
        { status: 400 }
      );
    }

    // Get user from database
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
    });

    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Verify current password
    const isValid = await verifyPassword(currentPassword, dbUser.password);

    if (!isValid) {
      // Log failed password change attempt
      await createAuditLog({
        action: AuditActions.PASSWORD_CHANGE_FAILED,
        entityType: EntityTypes.USER,
        entityId: user.id,
        userId: user.id,
        details: { reason: "invalid_current_password" },
      }).catch(console.error);

      return NextResponse.json(
        { error: "Current password is incorrect" },
        { status: 400 }
      );
    }

    // Validate new password strength
    const strengthResult = validatePasswordStrength(newPassword);

    if (!strengthResult.valid) {
      return NextResponse.json(
        {
          error: "Password does not meet strength requirements",
          details: strengthResult.errors,
        },
        { status: 400 }
      );
    }

    // Check if new password is different from current password
    const isSamePassword = await verifyPassword(newPassword, dbUser.password);

    if (isSamePassword) {
      return NextResponse.json(
        { error: "New password must be different from current password" },
        { status: 400 }
      );
    }

    // Hash new password
    const newPasswordHash = await hashPassword(newPassword);

    // Update password in database
    await prisma.user.update({
      where: { id: user.id },
      data: { password: newPasswordHash },
    });

    // Log successful password change
    await createAuditLog({
      action: AuditActions.PASSWORD_CHANGED,
      entityType: EntityTypes.USER,
      entityId: user.id,
      userId: user.id,
      details: {
        userAgent: request.headers.get("user-agent") ?? undefined,
        ipAddress:
          request.headers.get("x-forwarded-for")?.split(",")[0] ?? undefined,
      },
    }).catch(console.error);

    return NextResponse.json({
      data: { success: true },
      message: "Password changed successfully",
    });
  } catch (error) {
    console.error("Password change error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
