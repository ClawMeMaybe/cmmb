import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { listWorkspaceFiles, getWorkspaceStats } from "@/server/workspace";
import type { ApiResponse, WorkspaceStats } from "@/types";
import type { WorkspaceFile } from "@/types/workspace";

export async function GET(
  request: Request
): Promise<NextResponse<ApiResponse<WorkspaceFile[] | WorkspaceStats>>> {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const path = searchParams.get("path") || "";
    const stats = searchParams.get("stats") === "true";

    // Only admins can access workspace files
    if (session.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (stats) {
      const workspaceStats = await getWorkspaceStats();
      return NextResponse.json({ data: workspaceStats });
    }

    const files = await listWorkspaceFiles(path);
    return NextResponse.json({ data: files });
  } catch (error) {
    console.error("List workspace files error:", error);
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
