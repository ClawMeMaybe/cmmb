import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getPluginLogs, clearPluginLogs } from "@/server/plugins";
import type { ApiResponse, PluginLog } from "@/types";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<ApiResponse<PluginLog[]>>> {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const filters = {
      level: searchParams.get("level") as
        | "info"
        | "warn"
        | "error"
        | "debug"
        | undefined,
      source: searchParams.get("source") ?? undefined,
      periodStart: searchParams.get("periodStart")
        ? new Date(searchParams.get("periodStart")!)
        : undefined,
      periodEnd: searchParams.get("periodEnd")
        ? new Date(searchParams.get("periodEnd")!)
        : undefined,
      limit: parseInt(searchParams.get("limit") ?? "100", 10),
    };

    const logs = await getPluginLogs(id, filters);

    return NextResponse.json({ data: logs });
  } catch (error) {
    console.error("Get plugin logs error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<ApiResponse<{ count: number }>>> {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const count = await clearPluginLogs(id, session.id);

    return NextResponse.json({
      data: { count },
      message: `Cleared ${count} log entries`,
    });
  } catch (error) {
    console.error("Clear plugin logs error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
