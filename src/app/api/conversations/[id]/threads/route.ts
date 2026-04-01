import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getConversationThreads } from "@/server/conversations";
import type { ApiResponse, ConversationListItem } from "@/types";

/**
 * GET /api/conversations/[id]/threads - Get conversation threads
 * Returns all thread conversations for a parent conversation
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<ConversationListItem[]>>> {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const threads = await getConversationThreads(id);

    return NextResponse.json({ data: threads });
  } catch (error) {
    console.error("Get conversation threads error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
