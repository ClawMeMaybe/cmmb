import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getAgentById, createAgentTestRun } from "@/server/agents";
import type { ApiResponse, AgentTestResult } from "@/types";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<ApiResponse<AgentTestResult>>> {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { input } = body;

    if (!input || typeof input !== "string") {
      return NextResponse.json(
        { error: "Test input is required" },
        { status: 400 }
      );
    }

    const agent = await getAgentById(id);

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    // Simulate agent test (in production, this would call the actual AI model)
    const startTime = Date.now();

    // For now, simulate a response based on system prompt
    // In production, this would integrate with OpenClaw gateway
    let output: string | undefined;
    let success = true;
    let error: string | undefined;

    try {
      // Simulate processing time
      const simulatedDuration = 500 + Math.random() * 1000;

      // Generate a simulated response
      if (agent.systemPrompt) {
        output =
          `[Simulated response for agent "${agent.name}" using model "${agent.model}"]\n\n` +
          `Based on system prompt: "${agent.systemPrompt.slice(0, 100)}..."\n\n` +
          `Input received: "${input}"\n\n` +
          `This is a sandbox test response. In production, this would be the actual AI response.`;
      } else {
        output =
          `[Simulated response for agent "${agent.name}"]\n\n` +
          `Input received: "${input}"\n\n` +
          `No system prompt configured. This is a sandbox test response.`;
      }

      // Simulate some delay
      await new Promise((resolve) => setTimeout(resolve, simulatedDuration));
    } catch (testError) {
      success = false;
      error = testError instanceof Error ? testError.message : "Test failed";
      output = undefined;
    }

    const duration = Date.now() - startTime;

    // Save test run
    await createAgentTestRun({
      agentId: id,
      input,
      output,
      success,
      duration,
      error,
    });

    return NextResponse.json({
      data: {
        success,
        output,
        error,
        duration,
      },
      message: success ? "Test completed successfully" : "Test failed",
    });
  } catch (error) {
    console.error("Agent test error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
