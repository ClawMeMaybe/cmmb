import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getApiKeys, createApiKey } from "@/server/api-keys";
import type { ApiResponse, ApiKeyWithStats, ApiKeyScope } from "@/types";

export async function GET(): Promise<
  NextResponse<ApiResponse<ApiKeyWithStats[]>>
> {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const apiKeys = await getApiKeys(session.id);

    return NextResponse.json({ data: apiKeys });
  } catch (error) {
    console.error("Get API keys error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest): Promise<
  NextResponse<
    ApiResponse<{
      id: string;
      key: string;
      name: string;
      scopes: ApiKeyScope[];
      expiresAt: Date | null;
      createdAt: Date;
    }>
  >
> {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, scopes, expiresAt } = body;

    if (!name || !scopes || !Array.isArray(scopes) || scopes.length === 0) {
      return NextResponse.json(
        { error: "Name and scopes are required" },
        { status: 400 }
      );
    }

    // Validate scopes
    const validScopes: ApiKeyScope[] = [
      "READ_INSTANCES",
      "WRITE_INSTANCES",
      "READ_CHANNELS",
      "WRITE_CHANNELS",
      "READ_ALERTS",
      "WRITE_ALERTS",
      "READ_LOGS",
      "READ_WORKSPACE",
      "WRITE_WORKSPACE",
      "ADMIN",
    ];

    const invalidScopes = scopes.filter(
      (s: string) => !validScopes.includes(s as ApiKeyScope)
    );
    if (invalidScopes.length > 0) {
      return NextResponse.json(
        { error: `Invalid scopes: ${invalidScopes.join(", ")}` },
        { status: 400 }
      );
    }

    const apiKey = await createApiKey(session.id, {
      name,
      description,
      scopes,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
    });

    return NextResponse.json(
      { data: apiKey, message: "API key created successfully" },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create API key error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
