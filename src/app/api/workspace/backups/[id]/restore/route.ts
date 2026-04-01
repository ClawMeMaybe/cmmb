import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { restoreWorkspaceBackup } from "@/server/workspace";
import type { ApiResponse } from "@/types";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<{ success: boolean }>>> {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    await restoreWorkspaceBackup(id, session.id);
    return NextResponse.json({ data: { success: true } });
  } catch (error) {
    console.error("Restore backup error:", error);
    const message =
      error instanceof Error ? error.message : "Internal server error";
    const status = message === "Backup not found" ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
