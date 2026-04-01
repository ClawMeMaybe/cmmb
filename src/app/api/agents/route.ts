import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getAgents, createAgent } from "@/server/agents";
import { AgentStatus } from "@prisma/client";
import type { ApiResponse, Agent, AgentFilters } from "@/types";

export async function GET(
  request: NextRequest
): Promise<NextResponse<ApiResponse<Agent[]>>> {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse query parameters for filtering
    const searchParams = request.nextUrl.searchParams;
    const filters: AgentFilters = {
      status: searchParams.get("status") as AgentStatus | undefined,
      instanceId: searchParams.get("instanceId") ?? undefined,
      enabled:
        searchParams.get("enabled") === "true"
          ? true
          : searchParams.get("enabled") === "false"
            ? false
            : undefined,
      search: searchParams.get("search") ?? undefined,
    };

    const agents = await getAgents(filters);

    return NextResponse.json({ data: agents });
  } catch (error) {
    console.error("Get agents error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest
): Promise<NextResponse<ApiResponse<Agent>>> {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      description,
      modelName,
      temperature,
      maxTokens,
      topP,
      topK,
      systemPrompt,
      capabilities,
      instanceId,
    } = body;

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const agent = await createAgent(
      {
        name,
        description,
        status: AgentStatus.INACTIVE,
        modelName,
        temperature,
        maxTokens,
        topP,
        topK,
        systemPrompt,
        capabilities,
        instanceId,
      },
      session.id
    );

    return NextResponse.json(
      { data: agent, message: "Agent created successfully" },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create agent error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
