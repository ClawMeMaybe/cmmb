import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  getResourceRequestById,
  updateResourceRequest,
  cancelResourceRequest,
} from "@/server/resource-requests";
import type { ApiResponse } from "@/types";
import type { ResourceRequestWithDetails } from "@/server/resource-requests";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * @openapi
 * /resource-requests/{id}:
 *   get:
 *     summary: Get resource request details
 *     description: Retrieve details of a specific resource request
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
 *         description: Resource request details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/ResourceRequest'
 *       '401':
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       '403':
 *         description: Forbidden - not authorized to view this request
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
 *   put:
 *     summary: Update a resource request
 *     description: Update a pending resource request (only by requester)
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
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateResourceRequestInput'
 *     responses:
 *       '200':
 *         description: Resource request updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/ResourceRequest'
 *                 message:
 *                   type: string
 *                   example: "Resource request updated successfully"
 *       '401':
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       '403':
 *         description: Forbidden - not authorized to update this request
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
 *   delete:
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
 *         description: Forbidden - not authorized to cancel this request
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

export async function GET(
  _request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<ApiResponse<ResourceRequestWithDetails>>> {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const resourceRequest = await getResourceRequestById(id);

    if (!resourceRequest) {
      return NextResponse.json(
        { error: "Resource request not found" },
        { status: 404 }
      );
    }

    // Non-admin users can only view their own requests
    if (
      session.role !== "ADMIN" &&
      resourceRequest.requesterId !== session.id
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({ data: resourceRequest });
  } catch (error) {
    console.error("Get resource request error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<ApiResponse<ResourceRequestWithDetails>>> {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    const resourceRequest = await updateResourceRequest(id, body, session.id);

    if (!resourceRequest) {
      return NextResponse.json(
        { error: "Resource request not found" },
        { status: 404 }
      );
    }

    const fullRequest = await getResourceRequestById(id);

    return NextResponse.json({
      data: fullRequest ?? resourceRequest,
      message: "Resource request updated successfully",
    });
  } catch (error) {
    console.error("Update resource request error:", error);

    if (error instanceof Error) {
      if (error.message.includes("Only the requester")) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      if (error.message.includes("Cannot update request")) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<ApiResponse<ResourceRequestWithDetails>>> {
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
