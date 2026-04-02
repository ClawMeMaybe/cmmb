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

/**
 * @openapi
 * /resource-requests/{id}/cancel:
 *   post:
 *     summary: Cancel a resource request
 *     description: Cancel a pending resource request (only by requester)
 *     tags:
 *       - ResourceRequests
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Resource request ID
 *         schema:
 *           type: string
 *     responses:
 *       '200':
 *         description: Resource request cancelled successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/ResourceRequest'
 *                 message:
 *                   type: string
 *                   example: "Resource request cancelled successfully"
 *       '401':
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       '403':
 *         description: Forbidden - only requester can cancel
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       '404':
 *         description: Resource request not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       '500':
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

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
