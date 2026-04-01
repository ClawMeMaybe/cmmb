import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getApiKeyById, updateApiKey, deleteApiKey } from "@/server/api-keys";
import type { ApiResponse, ApiKeyWithStats, ApiKeyScope } from "@/types";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<ApiKeyWithStats>>> {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const apiKey = await getApiKeyById(id, session.id);

    if (!apiKey) {
      return NextResponse.json({ error: "API key not found" }, { status: 404 });
    }

    return NextResponse.json({ data: apiKey });
  } catch (error) {
    console.error("Get API key error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<ApiKeyWithStats>>> {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { name, description, scopes, expiresAt } = body;

    // Validate scopes if provided
    if (scopes) {
      if (!Array.isArray(scopes) || scopes.length === 0) {
        return NextResponse.json(
          { error: "Scopes must be a non-empty array" },
          { status: 400 }
        );
      }

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
    }

    const apiKey = await updateApiKey(id, session.id, {
      name,
      description,
      scopes,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
    });

    if (!apiKey) {
      return NextResponse.json({ error: "API key not found" }, { status: 404 });
    }

    // Get the full key with stats
    const keyWithStats = await getApiKeyById(id, session.id);

    return NextResponse.json({
      data: keyWithStats ?? undefined,
      message: "API key updated successfully",
    });
  } catch (error) {
    console.error("Update API key error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<null>>> {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const deleted = await deleteApiKey(id, session.id);

    if (!deleted) {
      return NextResponse.json({ error: "API key not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "API key deleted successfully" });
  } catch (error) {
    console.error("Delete API key error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
