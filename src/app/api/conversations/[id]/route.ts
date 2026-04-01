import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getConversationById } from "@/server/conversations";
import type { ApiResponse, ConversationWithMessages } from "@/types";

/**
 * GET /api/conversations/[id] - Get conversation details with messages
 * Query params:
 * - includeReplies: Include message replies (default true)
 * - messageLimit: Max messages to return (default 50)
 * - messageOffset: Offset for message pagination
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<ConversationWithMessages>>> {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { searchParams } = new URL(request.url);

    const options = {
      includeReplies: searchParams.get("includeReplies") !== "false",
      messageLimit: parseInt(searchParams.get("messageLimit") || "50", 10),
      messageOffset: parseInt(searchParams.get("messageOffset") || "0", 10),
    };

    // Validate options
    if (options.messageLimit < 1 || options.messageLimit > 1000) {
      return NextResponse.json(
        { error: "messageLimit must be between 1 and 1000" },
        { status: 400 }
      );
    }

    if (options.messageOffset < 0) {
      return NextResponse.json(
        { error: "messageOffset must be >= 0" },
        { status: 400 }
      );
    }

    const conversation = await getConversationById(id, options);

    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: conversation });
  } catch (error) {
    console.error("Get conversation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
