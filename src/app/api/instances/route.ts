import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getInstancesWithTags, createInstance } from "@/server/instances";
import { InstanceStatus } from "@prisma/client";
import type { ApiResponse, Instance } from "@/types";
import type { InstanceWithTags } from "@/server/instances";

export async function GET(
  request: NextRequest
): Promise<NextResponse<ApiResponse<InstanceWithTags[]>>> {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const tagsParam = searchParams.get("tags");
    const tagIds = tagsParam ? tagsParam.split(",").filter(Boolean) : undefined;

    const instances = await getInstancesWithTags({ tagIds });

    return NextResponse.json({ data: instances });
  } catch (error) {
    console.error("Get instances error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest
): Promise<NextResponse<ApiResponse<Instance>>> {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, gatewayUrl, token, tagIds } = body;

    if (!name || !gatewayUrl || !token) {
      return NextResponse.json(
        { error: "Name, gatewayUrl, and token are required" },
        { status: 400 }
      );
    }

    const instance = await createInstance({
      name,
      description,
      status: InstanceStatus.OFFLINE,
      gatewayUrl,
      token,
      createdById: session.id,
      tagIds,
    });

    return NextResponse.json(
      { data: instance, message: "Instance created successfully" },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create instance error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
