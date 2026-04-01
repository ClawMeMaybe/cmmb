import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  getMemoryEntry,
  updateMemoryEntry,
  deleteMemoryEntry,
} from "@/server/workspace";
import type { ApiResponse } from "@/types";
import type { MemoryEntry, MemoryEntryUpdate } from "@/types/workspace";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ name: string }> }
): Promise<NextResponse<ApiResponse<MemoryEntry>>> {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { name } = await params;
    const decodedName = decodeURIComponent(name);

    const entry = await getMemoryEntry(decodedName);
    if (!entry) {
      return NextResponse.json(
        { error: "Memory entry not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: entry });
  } catch (error) {
    console.error("Get memory entry error:", error);
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ name: string }> }
): Promise<NextResponse<ApiResponse<MemoryEntry>>> {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { name } = await params;
    const decodedName = decodeURIComponent(name);
    const body: MemoryEntryUpdate = await request.json();

    const entry = await updateMemoryEntry(decodedName, body);
    return NextResponse.json({ data: entry });
  } catch (error) {
    console.error("Update memory entry error:", error);
    const message =
      error instanceof Error ? error.message : "Internal server error";
    const status = message === "Memory entry not found" ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ name: string }> }
): Promise<NextResponse<ApiResponse<{ success: boolean }>>> {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { name } = await params;
    const decodedName = decodeURIComponent(name);

    await deleteMemoryEntry(decodedName);
    return NextResponse.json({ data: { success: true } });
  } catch (error) {
    console.error("Delete memory entry error:", error);
    const message =
      error instanceof Error ? error.message : "Internal server error";
    const status = message === "Memory entry not found" ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
