import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { updateAgentSystemPrompt } from "@/server/agents";
import type { ApiResponse, Agent } from "@/types";

interface RouteParams {
  params: Promise<{ id: string }>;
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
    const { systemPrompt } = body;

    if (systemPrompt === undefined) {
      return NextResponse.json(
        { error: "systemPrompt field is required" },
        { status: 400 }
      );
    }

    const agent = await updateAgentSystemPrompt(id, systemPrompt, session.id);

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    return NextResponse.json({
      data: agent,
      message: "System prompt updated successfully",
    });
  } catch (error) {
    console.error("Update system prompt error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
