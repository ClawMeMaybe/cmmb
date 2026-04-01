import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { bulkTagOperation } from "@/server/tags";
import type { ApiResponse } from "@/types";

export async function POST(
  request: NextRequest
): Promise<NextResponse<ApiResponse<{ count: number }>>> {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Only admins can perform bulk tag operations" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { instanceIds, tagIds, action } = body;

    if (
      !instanceIds ||
      !Array.isArray(instanceIds) ||
      instanceIds.length === 0
    ) {
      return NextResponse.json(
        { error: "Instance IDs array is required and must not be empty" },
        { status: 400 }
      );
    }

    if (!tagIds || !Array.isArray(tagIds) || tagIds.length === 0) {
      return NextResponse.json(
        { error: "Tag IDs array is required and must not be empty" },
        { status: 400 }
      );
    }

    if (!action || (action !== "add" && action !== "remove")) {
      return NextResponse.json(
        { error: "Action must be either 'add' or 'remove'" },
        { status: 400 }
      );
    }

    const result = await bulkTagOperation({
      instanceIds,
      tagIds,
      action,
      addedById: session.id,
    });

    return NextResponse.json({
      data: { count: result.count },
      message: `Bulk tag ${action} operation completed successfully`,
    });
  } catch (error) {
    console.error("Bulk tag operation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
