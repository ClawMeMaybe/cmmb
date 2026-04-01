import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  getAgentById,
  getAgentMetricsHistory,
  getAgentPerformance,
} from "@/server/agents";
import type {
  ApiResponse,
  AgentMetric,
  AgentPerformanceSummary,
} from "@/types";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
): Promise<
  NextResponse<
    ApiResponse<{ history: AgentMetric[]; summary: AgentPerformanceSummary }>
  >
> {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const agent = await getAgentById(id);

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    // Get query parameter for days
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get("days") || "30", 10);

    // Get metrics history and summary
    const history = await getAgentMetricsHistory(id, days);
    const summary = await getAgentPerformance(id);

    return NextResponse.json({ data: { history, summary } });
  } catch (error) {
    console.error("Get agent metrics error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
