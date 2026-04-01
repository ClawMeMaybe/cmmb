import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { exportConversation } from "@/server/conversations";
import type { ApiResponse } from "@/types";

/**
 * GET /api/conversations/[id]/export - Export conversation
 * Query params:
 * - format: Export format (json, csv, txt) - default json
 * - includeMetadata: Include metadata in export - default true
 * - includeReplies: Include message replies - default true
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<
  NextResponse<
    ApiResponse<{
      data: string;
      format: string;
      filename: string;
      mimeType: string;
    }>
  >
> {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { searchParams } = new URL(request.url);

    const format = searchParams.get("format") || "json";

    // Validate format
    if (!["json", "csv", "txt"].includes(format)) {
      return NextResponse.json(
        { error: "Format must be json, csv, or txt" },
        { status: 400 }
      );
    }

    const options = {
      format: format as "json" | "csv" | "txt",
      includeMetadata: searchParams.get("includeMetadata") !== "false",
      includeReplies: searchParams.get("includeReplies") !== "false",
    };

    const result = await exportConversation(id, options);

    if (!result) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      );
    }

    // Return as downloadable file
    return new NextResponse(result.data, {
      headers: {
        "Content-Type": result.mimeType,
        "Content-Disposition": `attachment; filename="${result.filename}"`,
      },
    });
  } catch (error) {
    console.error("Export conversation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
