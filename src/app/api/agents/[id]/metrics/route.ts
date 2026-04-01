import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getAgentMetrics, getAgentById } from "@/server/agents";
import type { ApiResponse, AgentMetric } from "@/types";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<ApiResponse<AgentMetric[]>>> {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Check agent exists
    const agent = await getAgentById(id);
    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const periodStart = searchParams.get("periodStart")
      ? new Date(searchParams.get("periodStart")!)
      : undefined;
    const periodEnd = searchParams.get("periodEnd")
      ? new Date(searchParams.get("periodEnd")!)
      : undefined;
    const limit = searchParams.get("limit")
      ? parseInt(searchParams.get("limit")!, 10)
      : 100;

    const metrics = await getAgentMetrics({
      agentId: id,
      periodStart,
      periodEnd,
      limit,
    });

    return NextResponse.json({ data: metrics });
  } catch (error) {
    console.error("Get agent metrics error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
