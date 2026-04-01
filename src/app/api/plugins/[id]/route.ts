import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  getPluginById,
  getPluginWithLogs,
  updatePlugin,
  deletePlugin,
} from "@/server/plugins";
import type { ApiResponse, Plugin, PluginWithLogs } from "@/types";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<ApiResponse<Plugin | PluginWithLogs>>> {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Check if logs are requested
    const searchParams = request.nextUrl.searchParams;
    const includeLogs = searchParams.get("logs") === "true";
    const logLimit = parseInt(searchParams.get("logLimit") ?? "100", 10);

    const plugin = includeLogs
      ? await getPluginWithLogs(id, logLimit)
      : await getPluginById(id);

    if (!plugin) {
      return NextResponse.json({ error: "Plugin not found" }, { status: 404 });
    }

    return NextResponse.json({ data: plugin });
  } catch (error) {
    console.error("Get plugin error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
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

    const plugin = await updatePlugin(id, body, session.id);

    if (!plugin) {
      return NextResponse.json({ error: "Plugin not found" }, { status: 404 });
    }

    return NextResponse.json({
      data: plugin,
      message: "Plugin updated successfully",
    });
  } catch (error) {
    console.error("Update plugin error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<ApiResponse<null>>> {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const existing = await getPluginById(id);
    if (!existing) {
      return NextResponse.json({ error: "Plugin not found" }, { status: 404 });
    }

    await deletePlugin(id, session.id);

    return NextResponse.json({ message: "Plugin uninstalled successfully" });
  } catch (error) {
    console.error("Uninstall plugin error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
