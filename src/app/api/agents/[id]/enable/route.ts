import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { setAgentEnabled } from "@/server/agents";
import type { ApiResponse, Agent } from "@/types";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(
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
    const { enabled } = body;

    if (enabled === undefined || enabled === null) {
      return NextResponse.json(
        { error: "enabled field is required" },
        { status: 400 }
      );
    }

    const agent = await setAgentEnabled(id, Boolean(enabled), session.id);

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    return NextResponse.json({
      data: agent,
      message: enabled
        ? "Agent enabled successfully"
        : "Agent disabled successfully",
    });
  } catch (error) {
    console.error("Enable/disable agent error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
