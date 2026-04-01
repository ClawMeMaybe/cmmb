import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { updateAgentModelConfig } from "@/server/agents";
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
    const { modelName, temperature, maxTokens, topP, topK } = body;

    // At least one field must be provided
    if (
      modelName === undefined &&
      temperature === undefined &&
      maxTokens === undefined &&
      topP === undefined &&
      topK === undefined
    ) {
      return NextResponse.json(
        { error: "At least one model configuration field is required" },
        { status: 400 }
      );
    }

    const agent = await updateAgentModelConfig(
      id,
      {
        modelName,
        temperature,
        maxTokens,
        topP,
        topK,
      },
      session.id
    );

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    return NextResponse.json({
      data: agent,
      message: "Model configuration updated successfully",
    });
  } catch (error) {
    console.error("Update model config error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
