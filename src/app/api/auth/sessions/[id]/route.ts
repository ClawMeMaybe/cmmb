import { NextResponse } from "next/server";
import { getSession, revokeSession } from "@/lib/auth";
import { createAuditLog, AuditActions, EntityTypes } from "@/lib/audit";
import type { ApiResponse } from "@/types";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<{ revoked: boolean }>>> {
  try {
    const user = await getSession();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const success = await revokeSession(id, user.id);

    if (!success) {
      return NextResponse.json(
        { error: "Session not found or not owned by user" },
        { status: 404 }
      );
    }

    // Log session revocation
    await createAuditLog({
      action: AuditActions.SESSION_REVOKED,
      entityType: EntityTypes.SESSION,
      entityId: id,
      userId: user.id,
      details: { email: user.email },
    }).catch(console.error);

    return NextResponse.json({
      data: { revoked: true },
      message: "Session revoked successfully",
    });
  } catch (error) {
    console.error("Revoke session error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
