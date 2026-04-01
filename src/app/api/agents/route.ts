import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getAgents, createAgent } from "@/server/agents";
import type { ApiResponse, Agent } from "@/types";

export async function GET(): Promise<NextResponse<ApiResponse<Agent[]>>> {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const agents = await getAgents();

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
      model,
      systemPrompt,
      status,
      enabled,
      config,
      instanceId,
    } = body;

    if (!name) {
      return NextResponse.json(
        { error: "Agent name is required" },
        { status: 400 }
      );
    }

    const agent = await createAgent(
      {
        name,
        description,
        model,
        systemPrompt,
        status,
        enabled,
        config,
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
