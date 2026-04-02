import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  approveResourceRequest,
  getResourceRequestById,
} from "@/server/resource-requests";
import type { ApiResponse, ResourceRequest } from "@/types";
import type { ResourceRequestWithDetails } from "@/server/resource-requests";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * @openapi
 * /resource-requests/{id}/approve:
 *   post:
 *     summary: Approve a resource request
 *     description: Approve a pending resource request (admin only)
 *     tags:
 *       - ResourceRequests
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Resource request ID
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               approvalNote:
 *                 type: string
 *                 description: Optional note from approver
 *     responses:
 *       '200':
 *         description: Resource request approved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/ResourceRequest'
 *                 message:
 *                   type: string
 *                   example: "Resource request approved successfully"
 *       '401':
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       '403':
 *         description: Forbidden - admin only
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

    // Only admins can approve requests
    if (session.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Forbidden - admin only" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const { approvalNote } = body;

    const resourceRequest = await approveResourceRequest(
      id,
      session.id,
      approvalNote
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
      message: "Resource request approved successfully",
    });
  } catch (error) {
    console.error("Approve resource request error:", error);

    if (
      error instanceof Error &&
      error.message.includes("Cannot approve request")
    ) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
