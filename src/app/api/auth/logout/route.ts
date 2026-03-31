import { NextResponse } from "next/server";
import { clearSession, getSession } from "@/lib/auth";
import { createAuditLog, AuditActions, EntityTypes } from "@/lib/audit";
import type { ApiResponse } from "@/types";

export async function POST(): Promise<NextResponse<ApiResponse<null>>> {
  try {
    const session = await getSession();
    await clearSession();

    // Log logout if user was logged in
    if (session) {
      await createAuditLog({
        action: AuditActions.LOGOUT,
        entityType: EntityTypes.SESSION,
        entityId: session.id,
        userId: session.id,
        details: { email: session.email },
      }).catch(console.error);
    }

    return NextResponse.json({
      message: "Logged out successfully",
    });
  } catch (error) {
    console.error("Logout error:", error);
    return NextResponse.json({ error: "Failed to logout" }, { status: 500 });
  }
}
