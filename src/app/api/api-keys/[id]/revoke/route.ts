import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { revokeApiKey, getApiKeyById } from "@/server/api-keys";
import type { ApiResponse, ApiKeyWithStats } from "@/types";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<ApiKeyWithStats>>> {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const revoked = await revokeApiKey(id, session.id);

    if (!revoked) {
      return NextResponse.json(
        { error: "API key not found or already revoked" },
        { status: 404 }
      );
    }

    // Get the updated key
    const apiKey = await getApiKeyById(id, session.id);

    return NextResponse.json({
      data: apiKey ?? undefined,
      message: "API key revoked successfully",
    });
  } catch (error) {
    console.error("Revoke API key error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
