import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getApiKeyById, getApiKeyUsageLogs } from "@/server/api-keys";
import type { ApiResponse, ApiKeyUsageLog } from "@/types";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<ApiKeyUsageLog[]>>> {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Verify the API key belongs to the user
    const apiKey = await getApiKeyById(id, session.id);
    if (!apiKey) {
      return NextResponse.json({ error: "API key not found" }, { status: 404 });
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const limit = searchParams.get("limit");
    const offset = searchParams.get("offset");

    const logs = await getApiKeyUsageLogs({
      apiKeyId: id,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      limit: limit ? parseInt(limit, 10) : 100,
      offset: offset ? parseInt(offset, 10) : 0,
    });

    return NextResponse.json({ data: logs });
  } catch (error) {
    console.error("Get API key usage logs error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
