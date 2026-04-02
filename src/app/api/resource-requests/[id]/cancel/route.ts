import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  cancelResourceRequest,
  getResourceRequestById,
} from "@/server/resource-requests";
import type { ApiResponse, ResourceRequest } from "@/types";
import type { ResourceRequestWithDetails } from "@/server/resource-requests";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(
  _request: NextRequest,
  { params }: RouteParams
): Promise<
  NextResponse<ApiResponse<ResourceRequestWithDetails | ResourceRequest>>
> {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const resourceRequest = await cancelResourceRequest(id, session.id);

    if (!resourceRequest) {
      return NextResponse.json(
        { error: "Resource request not found" },
        { status: 404 }
      );
    }

    const fullRequest = await getResourceRequestById(id);

    return NextResponse.json({
      data: fullRequest ?? resourceRequest,
      message: "Resource request cancelled successfully",
    });
  } catch (error) {
    console.error("Cancel resource request error:", error);

    if (error instanceof Error) {
      if (error.message.includes("Only the requester")) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      if (error.message.includes("Cannot cancel request")) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
