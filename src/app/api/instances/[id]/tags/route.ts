import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getTagsForInstance, addTagToInstance } from "@/server/tags";
import type { ApiResponse, Tag } from "@/types";
import type { InstanceTag } from "@prisma/client";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(
  _request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<ApiResponse<(InstanceTag & { tag: Tag })[]>>> {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const instanceTags = await getTagsForInstance(id);

    return NextResponse.json({ data: instanceTags });
  } catch (error) {
    console.error("Get instance tags error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<ApiResponse<InstanceTag & { tag: Tag }>>> {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { tagId } = body;

    if (!tagId) {
      return NextResponse.json(
        { error: "Tag ID is required" },
        { status: 400 }
      );
    }

    const instanceTag = await addTagToInstance({
      instanceId: id,
      tagId,
      assignedBy: session.id,
    });

    return NextResponse.json(
      { data: instanceTag, message: "Tag added to instance successfully" },
      { status: 201 }
    );
  } catch (error) {
    console.error("Add tag to instance error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
