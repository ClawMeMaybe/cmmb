import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getConversations } from "@/server/conversations";
import type { ApiResponse, ConversationListResponse } from "@/types";

/**
 * GET /api/conversations - List conversations with filters
 * Query params:
 * - channelId: Filter by channel
 * - contactId: Filter by contact
 * - status: Filter by status (ACTIVE, ARCHIVED, ENDED)
 * - search: Search in message content
 * - startDate: Filter by date range (ISO string)
 * - endDate: Filter by date range (ISO string)
 * - parentId: Filter for thread parent (null for root conversations)
 * - page: Page number (default 1)
 * - limit: Page size (default 20, max 100)
 * - sortBy: Sort field (lastMessageAt, createdAt, messageCount)
 * - sortOrder: Sort order (asc, desc)
 */
export async function GET(
  request: NextRequest
): Promise<NextResponse<ApiResponse<ConversationListResponse>>> {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);

    // Parse filters
    const filters = {
      channelId: searchParams.get("channelId") || undefined,
      contactId: searchParams.get("contactId") || undefined,
      status: searchParams.get("status") || undefined,
      search: searchParams.get("search") || undefined,
      startDate: searchParams.get("startDate") || undefined,
      endDate: searchParams.get("endDate") || undefined,
      parentId: searchParams.get("parentId") || undefined,
    };

    // Parse pagination
    const pagination = {
      page: parseInt(searchParams.get("page") || "1", 10),
      limit: parseInt(searchParams.get("limit") || "20", 10),
      sortBy:
        (searchParams.get("sortBy") as
          | "lastMessageAt"
          | "createdAt"
          | "messageCount") || undefined,
      sortOrder: (searchParams.get("sortOrder") as "asc" | "desc") || undefined,
    };

    // Validate pagination
    if (pagination.page < 1) {
      return NextResponse.json({ error: "Page must be >= 1" }, { status: 400 });
    }

    if (pagination.limit < 1 || pagination.limit > 100) {
      return NextResponse.json(
        { error: "Limit must be between 1 and 100" },
        { status: 400 }
      );
    }

    const result = await getConversations(filters, pagination);

    return NextResponse.json({ data: result });
  } catch (error) {
    console.error("Get conversations error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
