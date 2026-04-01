import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getPluginStatus } from "@/server/plugins";
import type { ApiResponse, PluginStatusResponse } from "@/types";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<ApiResponse<PluginStatusResponse>>> {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const status = await getPluginStatus(id);

    if (!status) {
      return NextResponse.json({ error: "Plugin not found" }, { status: 404 });
    }

    return NextResponse.json({ data: status });
  } catch (error) {
    console.error("Get plugin status error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
