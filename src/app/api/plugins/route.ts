import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getPlugins, getPluginSummaries, createPlugin } from "@/server/plugins";
import { PluginStatus } from "@prisma/client";
import type {
  ApiResponse,
  Plugin,
  PluginSummary,
  PluginFilters,
} from "@/types";

export async function GET(
  request: NextRequest
): Promise<NextResponse<ApiResponse<Plugin[] | PluginSummary[]>>> {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse query parameters for filtering
    const searchParams = request.nextUrl.searchParams;
    const filters: PluginFilters = {
      status: searchParams.get("status") as PluginStatus | undefined,
      instanceId: searchParams.get("instanceId") ?? undefined,
      enabled:
        searchParams.get("enabled") === "true"
          ? true
          : searchParams.get("enabled") === "false"
            ? false
            : undefined,
      category: searchParams.get("category") ?? undefined,
      search: searchParams.get("search") ?? undefined,
    };

    // Check if summary mode is requested
    const summary = searchParams.get("summary") === "true";

    if (summary) {
      const summaries = await getPluginSummaries(filters);
      return NextResponse.json({ data: summaries });
    }

    const plugins = await getPlugins(filters);
    return NextResponse.json({ data: plugins });
  } catch (error) {
    console.error("Get plugins error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest
): Promise<NextResponse<ApiResponse<Plugin>>> {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      version,
      description,
      author,
      homepage,
      repository,
      category,
      config,
      instanceId,
    } = body;

    if (!name || !version) {
      return NextResponse.json(
        { error: "Name and version are required" },
        { status: 400 }
      );
    }

    const plugin = await createPlugin(
      {
        name,
        version,
        description,
        status: PluginStatus.INSTALLED,
        author,
        homepage,
        repository,
        category,
        config,
        instanceId,
      },
      session.id
    );

    return NextResponse.json(
      { data: plugin, message: "Plugin installed successfully" },
      { status: 201 }
    );
  } catch (error) {
    console.error("Install plugin error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
