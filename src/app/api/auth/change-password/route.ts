import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, verifyPassword, hashPassword } from "@/lib/auth";
import { createAuditLog, AuditActions, EntityTypes } from "@/lib/audit";
import type { ApiResponse } from "@/types";

/**
 * Password strength validation
 * Requires at least 8 characters, one uppercase, one lowercase, and one number
 */
function validatePasswordStrength(password: string): {
  valid: boolean;
  message?: string;
} {
  if (password.length < 8) {
    return { valid: false, message: "Password must be at least 8 characters" };
  }
  if (!/[A-Z]/.test(password)) {
    return {
      valid: false,
      message: "Password must contain at least one uppercase letter",
    };
  }
  if (!/[a-z]/.test(password)) {
    return {
      valid: false,
      message: "Password must contain at least one lowercase letter",
    };
  }
  if (!/[0-9]/.test(password)) {
    return {
      valid: false,
      message: "Password must contain at least one number",
    };
  }
  return { valid: true };
}

export async function POST(
  request: NextRequest
): Promise<NextResponse<ApiResponse<{ success: boolean }>>> {
  try {
    const user = await getSession();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { currentPassword, newPassword } = body;

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: "Current password and new password are required" },
        { status: 400 }
      );
    }

    // Get user with password hash
    const userWithPassword = await prisma.user.findUnique({
      where: { id: user.id },
      select: { id: true, email: true, password: true },
    });

    if (!userWithPassword) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Verify current password
    const isValid = await verifyPassword(
      currentPassword,
      userWithPassword.password
    );

    if (!isValid) {
      // Log failed password change attempt
      await createAuditLog({
        action: AuditActions.PASSWORD_CHANGE,
        entityType: EntityTypes.USER,
        entityId: user.id,
        userId: user.id,
        details: { success: false, reason: "invalid_current_password" },
      }).catch(console.error);

      return NextResponse.json(
        { error: "Current password is incorrect" },
        { status: 400 }
      );
    }

    // Validate new password strength
    const strengthCheck = validatePasswordStrength(newPassword);
    if (!strengthCheck.valid) {
      return NextResponse.json(
        { error: strengthCheck.message },
        { status: 400 }
      );
    }

    // Ensure new password is different from current
    const newHash = await hashPassword(newPassword);
    if (newHash === userWithPassword.password) {
      return NextResponse.json(
        { error: "New password must be different from current password" },
        { status: 400 }
      );
    }

    // Update password
    await prisma.user.update({
      where: { id: user.id },
      data: { password: newHash },
    });

    // Log successful password change
    await createAuditLog({
      action: AuditActions.PASSWORD_CHANGE,
      entityType: EntityTypes.USER,
      entityId: user.id,
      userId: user.id,
      details: { success: true },
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
