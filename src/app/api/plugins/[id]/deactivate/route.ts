import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { deactivatePlugin } from "@/server/plugins";
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

    const plugin = await deactivatePlugin(id, session.id);

    if (!plugin) {
      return NextResponse.json({ error: "Plugin not found" }, { status: 404 });
    }

    return NextResponse.json({
      data: plugin,
      message: "Plugin deactivated successfully",
    });
  } catch (error) {
    console.error("Deactivate plugin error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
