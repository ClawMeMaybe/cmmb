import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getWorkspaceBackup, deleteWorkspaceBackup } from "@/server/workspace";
import type { ApiResponse } from "@/types";
import type { WorkspaceBackup } from "@prisma/client";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<WorkspaceBackup>>> {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    const backup = await getWorkspaceBackup(id);
    if (!backup) {
      return NextResponse.json({ error: "Backup not found" }, { status: 404 });
    }

    return NextResponse.json({ data: backup });
  } catch (error) {
    console.error("Get backup error:", error);
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
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

    await deleteWorkspaceBackup(id, session.id);
    return NextResponse.json({ data: { success: true } });
  } catch (error) {
    console.error("Delete backup error:", error);
    const message =
      error instanceof Error ? error.message : "Internal server error";
    const status = message === "Backup not found" ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
