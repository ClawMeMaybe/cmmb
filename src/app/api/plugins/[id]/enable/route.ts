import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { setPluginEnabled } from "@/server/plugins";
import type { ApiResponse, Plugin } from "@/types";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PUT(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<ApiResponse<Plugin>>> {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { enabled } = body;

    if (typeof enabled !== "boolean") {
      return NextResponse.json(
        { error: "Enabled must be a boolean" },
        { status: 400 }
      );
    }

    const plugin = await setPluginEnabled(id, enabled, session.id);

    if (!plugin) {
      return NextResponse.json({ error: "Plugin not found" }, { status: 404 });
    }

    return NextResponse.json({
      data: plugin,
      message: enabled ? "Plugin enabled" : "Plugin disabled",
    });
  } catch (error) {
    console.error("Enable/disable plugin error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
