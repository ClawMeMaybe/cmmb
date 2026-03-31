import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getInstances, createInstance } from "@/server/instances";
import { InstanceStatus } from "@prisma/client";
import type { ApiResponse, Instance } from "@/types";

export async function GET(): Promise<NextResponse<ApiResponse<Instance[]>>> {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const instances = await getInstances();

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
    const { name, description, gatewayUrl, token } = body;

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
