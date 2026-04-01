import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getTags, createTag } from "@/server/tags";
import type { ApiResponse, Tag } from "@/types";

export async function GET(): Promise<NextResponse<ApiResponse<Tag[]>>> {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tags = await getTags();

    return NextResponse.json({ data: tags });
  } catch (error) {
    console.error("Get tags error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest
): Promise<NextResponse<ApiResponse<Tag>>> {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Only admins can create tags" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, color } = body;

    if (!name) {
      return NextResponse.json(
        { error: "Tag name is required" },
        { status: 400 }
      );
    }

    const tag = await createTag({
      name,
      color,
    });

    return NextResponse.json(
      { data: tag, message: "Tag created successfully" },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create tag error:", error);
    if (error instanceof Error && error.message.includes("Unique constraint")) {
      return NextResponse.json(
        { error: "Tag name already exists" },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
