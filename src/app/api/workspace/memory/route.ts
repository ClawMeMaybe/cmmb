import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { listMemoryEntries, createMemoryEntry } from "@/server/workspace";
import type { ApiResponse } from "@/types";
import type { MemoryEntry, MemoryEntryInput } from "@/types/workspace";

export async function GET(): Promise<NextResponse<ApiResponse<MemoryEntry[]>>> {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const entries = await listMemoryEntries();
    return NextResponse.json({ data: entries });
  } catch (error) {
    console.error("List memory entries error:", error);
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(
  request: Request
): Promise<NextResponse<ApiResponse<MemoryEntry>>> {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body: MemoryEntryInput = await request.json();

    if (!body.name || !body.type || !body.content) {
      return NextResponse.json(
        { error: "Name, type, and content are required" },
        { status: 400 }
      );
    }

    const entry = await createMemoryEntry(body);
    return NextResponse.json({ data: entry });
  } catch (error) {
    console.error("Create memory entry error:", error);
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
