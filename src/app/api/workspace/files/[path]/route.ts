import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  readWorkspaceFile,
  writeWorkspaceFile,
  deleteWorkspaceFile,
} from "@/server/workspace";
import type { ApiResponse } from "@/types";
import type { WorkspaceFileContent } from "@/types/workspace";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string }> }
): Promise<NextResponse<ApiResponse<WorkspaceFileContent>>> {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { path } = await params;
    const decodedPath = decodeURIComponent(path);

    const file = await readWorkspaceFile(decodedPath);
    return NextResponse.json({ data: file });
  } catch (error) {
    console.error("Read workspace file error:", error);
    const message =
      error instanceof Error ? error.message : "Internal server error";
    const status = message === "File not found" ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ path: string }> }
): Promise<NextResponse<ApiResponse<WorkspaceFileContent>>> {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { path } = await params;
    const decodedPath = decodeURIComponent(path);
    const body = await request.json();

    if (typeof body.content !== "string") {
      return NextResponse.json(
        { error: "Content must be a string" },
        { status: 400 }
      );
    }

    const file = await writeWorkspaceFile(decodedPath, body.content);
    return NextResponse.json({ data: file });
  } catch (error) {
    console.error("Write workspace file error:", error);
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ path: string }> }
): Promise<NextResponse<ApiResponse<{ success: boolean }>>> {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { path } = await params;
    const decodedPath = decodeURIComponent(path);

    await deleteWorkspaceFile(decodedPath);
    return NextResponse.json({ data: { success: true } });
  } catch (error) {
    console.error("Delete workspace file error:", error);
    const message =
      error instanceof Error ? error.message : "Internal server error";
    const status = message === "File not found" ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
