import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getLogs } from "@/server/logs";
import type { ApiResponse } from "@/types";
import type { LogsApiResponse } from "@/types/logs";

export async function GET(
  request: NextRequest
): Promise<NextResponse<ApiResponse<LogsApiResponse>>> {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;

    // Build params object, only including defined values
    const params: {
      instanceId?: string;
      level?: "error" | "warn" | "info" | "debug";
      source?: "gateway" | "agent";
      search?: string;
      startDate?: string;
      endDate?: string;
      page?: number;
      pageSize?: number;
    } = {};

    const instanceId = searchParams.get("instanceId");
    if (instanceId) params.instanceId = instanceId;

    const level = searchParams.get("level");
    if (level) params.level = level as "error" | "warn" | "info" | "debug";

    const source = searchParams.get("source");
    if (source) params.source = source as "gateway" | "agent";

    const search = searchParams.get("search");
    if (search) params.search = search;

    const startDate = searchParams.get("startDate");
    if (startDate) params.startDate = startDate;

    const endDate = searchParams.get("endDate");
    if (endDate) params.endDate = endDate;

    const page = searchParams.get("page");
    if (page) params.page = parseInt(page, 10);

    const pageSize = searchParams.get("pageSize");
    if (pageSize) params.pageSize = parseInt(pageSize, 10);

    // Validate level parameter
    if (
      params.level &&
      !["error", "warn", "info", "debug"].includes(params.level)
    ) {
      return NextResponse.json(
        { error: "Invalid level parameter" },
        { status: 400 }
      );
    }

    // Validate source parameter
    if (params.source && !["gateway", "agent"].includes(params.source)) {
      return NextResponse.json(
        { error: "Invalid source parameter" },
        { status: 400 }
      );
    }

    const result = await getLogs(params);

    return NextResponse.json({ data: result });
  } catch (error) {
    console.error("Get logs error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
