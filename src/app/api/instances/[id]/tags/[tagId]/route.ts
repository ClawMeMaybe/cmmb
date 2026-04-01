import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { removeTagFromInstance } from "@/server/tags";
import type { ApiResponse } from "@/types";

interface RouteParams {
  params: Promise<{ id: string; tagId: string }>;
}

export async function DELETE(
  _request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<ApiResponse<null>>> {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, tagId } = await params;
    await removeTagFromInstance(id, tagId);

    return NextResponse.json({
      message: "Tag removed from instance successfully",
    });
  } catch (error) {
    console.error("Remove tag from instance error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
