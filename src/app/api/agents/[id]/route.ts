import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  getAgentById,
  updateAgent,
  deleteAgent,
  getAgentPerformance,
} from "@/server/agents";
import type { ApiResponse, Agent, AgentPerformanceSummary } from "@/types";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(
  _request: NextRequest,
  { params }: RouteParams
): Promise<
  NextResponse<ApiResponse<Agent & { performance?: AgentPerformanceSummary }>>
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

    // Get performance summary
    const performance = await getAgentPerformance(id);

    return NextResponse.json({ data: { ...agent, performance } });
  } catch (error) {
    console.error("Get agent error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<ApiResponse<Agent>>> {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const agent = await updateAgent(id, body, session.id);

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    return NextResponse.json({
      data: agent,
      message: "Agent updated successfully",
    });
  } catch (error) {
    console.error("Update agent error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<ApiResponse<null>>> {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    await deleteAgent(id, session.id);

    return NextResponse.json({ message: "Agent deleted successfully" });
  } catch (error) {
    console.error("Delete agent error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
