import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  getResourceRequests,
  createResourceRequest,
} from "@/server/resource-requests";
import { ResourceRequestType, ResourceRequestStatus } from "@prisma/client";
import type { ApiResponse, ResourceRequest } from "@/types";
import type { ResourceRequestWithDetails } from "@/server/resource-requests";

/**
 * @openapi
 * /resource-requests:
 *   get:
 *     summary: Get resource request list
 *     description: Retrieve all resource requests with optional filtering
 *     tags:
 *       - ResourceRequests
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, APPROVED, REJECTED, CANCELLED, FULFILLED]
 *         description: Filter by request status
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [INSTANCE_ACCESS, NEW_INSTANCE, TOKEN_REQUEST, OTHER]
 *         description: Filter by request type
 *       - in: query
 *         name: requesterId
 *         schema:
 *           type: string
 *         description: Filter by requester ID
 *     responses:
 *       '200':
 *         description: List of resource requests
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/ResourceRequest'
 *       '401':
 *         description: Unauthorized
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
 *   post:
 *     summary: Create a new resource request
 *     description: Submit a new resource request with justification
 *     tags:
 *       - ResourceRequests
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateResourceRequestInput'
 *     responses:
 *       '201':
 *         description: Resource request created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/ResourceRequest'
 *                 message:
 *                   type: string
 *                   example: "Resource request created successfully"
 *       '400':
 *         description: Missing required fields
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       '401':
 *         description: Unauthorized
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
  request: NextRequest
): Promise<NextResponse<ApiResponse<ResourceRequestWithDetails[]>>> {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const statusParam = searchParams.get("status");
    const typeParam = searchParams.get("type");
    const requesterIdParam = searchParams.get("requesterId");

    const options = {
      status: statusParam ? (statusParam as ResourceRequestStatus) : undefined,
      type: typeParam ? (typeParam as ResourceRequestType) : undefined,
      requesterId: requesterIdParam ?? undefined,
    };

    // Non-admin users can only see their own requests
    if (session.role !== "ADMIN") {
      options.requesterId = session.id;
    }

    const requests = await getResourceRequests(options);

    return NextResponse.json({ data: requests });
  } catch (error) {
    console.error("Get resource requests error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest
): Promise<
  NextResponse<ApiResponse<ResourceRequestWithDetails | ResourceRequest>>
> {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      type,
      title,
      description,
      justification,
      quantity,
      instanceId,
      config,
    } = body;

    if (!title || !description || !justification) {
      return NextResponse.json(
        { error: "Title, description, and justification are required" },
        { status: 400 }
      );
    }

    // Validate justification length
    if (justification.length < 20) {
      return NextResponse.json(
        { error: "Justification must be at least 20 characters" },
        { status: 400 }
      );
    }

    const resourceRequest = await createResourceRequest({
      type: type ? (type as ResourceRequestType) : ResourceRequestType.OTHER,
      title,
      description,
      justification,
      quantity: quantity ?? 1,
      instanceId,
      config,
      requesterId: session.id,
    });

    // Get the full request with details
    const fullRequest = await getResourceRequests({ requesterId: session.id });
    const newRequest = fullRequest.find((r) => r.id === resourceRequest.id);

    return NextResponse.json(
      {
        data: newRequest ?? resourceRequest,
        message: "Resource request created successfully",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create resource request error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
