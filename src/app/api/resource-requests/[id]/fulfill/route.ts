import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  fulfillResourceRequest,
  getResourceRequestById,
} from "@/server/resource-requests";
import type { ApiResponse, ResourceRequest } from "@/types";
import type { ResourceRequestWithDetails } from "@/server/resource-requests";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(
  request: NextRequest,
  { params }: RouteParams
): Promise<
  NextResponse<ApiResponse<ResourceRequestWithDetails | ResourceRequest>>
> {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only admins can fulfill requests
    if (session.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Forbidden - admin only" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const { fulfillmentNote } = body;

    const resourceRequest = await fulfillResourceRequest(
      id,
      session.id,
      fulfillmentNote
    );

    if (!resourceRequest) {
      return NextResponse.json(
        { error: "Resource request not found" },
        { status: 404 }
      );
    }

    const fullRequest = await getResourceRequestById(id);

    return NextResponse.json({
      data: fullRequest ?? resourceRequest,
      message: "Resource request fulfilled successfully",
    });
  } catch (error) {
    console.error("Fulfill resource request error:", error);

    if (
      error instanceof Error &&
      error.message.includes("Cannot fulfill request")
    ) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
