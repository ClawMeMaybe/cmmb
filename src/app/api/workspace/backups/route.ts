import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  listWorkspaceBackups,
  createWorkspaceBackup,
} from "@/server/workspace";
import type { ApiResponse } from "@/types";
import type { WorkspaceBackup } from "@prisma/client";
import type { BackupCreateInput } from "@/types/workspace";

export async function GET(): Promise<
  NextResponse<ApiResponse<WorkspaceBackup[]>>
> {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const backups = await listWorkspaceBackups();
    return NextResponse.json({ data: backups });
  } catch (error) {
    console.error("List backups error:", error);
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(
  request: Request
): Promise<NextResponse<ApiResponse<WorkspaceBackup>>> {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body: BackupCreateInput = await request.json();

    const backup = await createWorkspaceBackup(session.id, body);
    return NextResponse.json({ data: backup });
  } catch (error) {
    console.error("Create backup error:", error);
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
