import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { testAgent } from "@/server/agents";
import type { ApiResponse, AgentTestResponse } from "@/types";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<ApiResponse<AgentTestResponse>>> {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { input, context } = body;

    if (!input) {
      return NextResponse.json({ error: "Input is required" }, { status: 400 });
    }

    const result = await testAgent(id, { input, context }, session.id);

    if (!result.success && result.error === "Agent not found") {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    return NextResponse.json({
      data: result,
      message: result.success
        ? "Agent test completed successfully"
        : "Agent test failed",
    });
  } catch (error) {
    console.error("Test agent error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
