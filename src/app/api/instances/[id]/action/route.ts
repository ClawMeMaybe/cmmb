import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  getInstanceById,
  updateInstance,
  createAuditLog,
} from "@/server/instances";
import { createGatewayClient, type InstanceAction } from "@/lib/gateway";
import { InstanceStatus } from "@prisma/client";
import type { ApiResponse, Instance } from "@/types";
import { z } from "zod";

// Validation schema for action request
const actionSchema = z.object({
  action: z.enum(["start", "stop", "restart"]),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * Status transitions based on action
 */
const actionStatusMap: Record<
  InstanceAction,
  { pending: InstanceStatus; success: InstanceStatus }
> = {
  start: { pending: InstanceStatus.STARTING, success: InstanceStatus.ONLINE },
  stop: { pending: InstanceStatus.STOPPING, success: InstanceStatus.OFFLINE },
  restart: { pending: InstanceStatus.STARTING, success: InstanceStatus.ONLINE },
};

/**
 * @openapi
 * /instances/{id}/action:
 *   patch:
 *     summary: Execute instance action
 *     description: Execute start, stop, or restart action on an instance. Requires admin role.
 *     tags:
 *       - Instances
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Instance ID
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/InstanceActionRequest'
 *     responses:
 *       '200':
 *         description: Action executed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/Instance'
 *                 message:
 *                   type: string
 *       '400':
 *         description: Invalid action
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
 *       '403':
 *         description: Forbidden - Admin role required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       '404':
 *         description: Instance not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       '409':
 *         description: Instance is in a transitional state
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       '500':
 *         description: Internal server error or action failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * PATCH /api/instances/[id]/action
 * Execute start/stop/restart action on an instance
 */
export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<ApiResponse<Instance>>> {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only admins can perform actions on instances
    if (session.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Forbidden: Admin role required" },
        { status: 403 }
      );
    }

    const { id } = await params;

    // Validate request body
    const body = await request.json();
    const validationResult = actionSchema.safeParse(body);

    if (!validationResult.success) {
      const firstError = validationResult.error.issues[0];
      return NextResponse.json(
        {
          error: `Invalid action: ${firstError?.message || "Unknown error"}`,
        },
        { status: 400 }
      );
    }

    const { action } = validationResult.data;

    // Get instance
    const instance = await getInstanceById(id);

    if (!instance) {
      return NextResponse.json(
        { error: "Instance not found" },
        { status: 404 }
      );
    }

    // Check if instance is in a state that allows actions
    if (
      instance.status === InstanceStatus.STARTING ||
      instance.status === InstanceStatus.STOPPING
    ) {
      return NextResponse.json(
        {
          error: `Instance is currently ${instance.status.toLowerCase()}. Please wait.`,
        },
        { status: 409 }
      );
    }

    // Set pending status
    const pendingStatus = actionStatusMap[action].pending;
    await updateInstance(id, { status: pendingStatus }, session.id);

    // Create Gateway client and execute action
    const gatewayClient = createGatewayClient(
      instance.gatewayUrl,
      instance.token
    );
    const result = await gatewayClient.executeAction(action);

    if (!result.success) {
      // Revert to error status on failure
      await updateInstance(id, { status: InstanceStatus.ERROR }, session.id);

      // Log failed action
      await createAuditLog({
        action: `${action.toUpperCase()}_INSTANCE`,
        entityType: "Instance",
        entityId: id,
        userId: session.id,
        instanceId: id,
        details: {
          action,
          success: false,
          error: result.error,
          previousStatus: instance.status,
        },
      });

      return NextResponse.json(
        { error: result.error || `Failed to ${action} instance` },
        { status: 500 }
      );
    }

    // Update to success status
    const successStatus = actionStatusMap[action].success;
    const updatedInstance = await updateInstance(
      id,
      { status: successStatus },
      session.id
    );

    // Log successful action
    await createAuditLog({
      action: `${action.toUpperCase()}_INSTANCE`,
      entityType: "Instance",
      entityId: id,
      userId: session.id,
      instanceId: id,
      details: {
        action,
        success: true,
        previousStatus: instance.status,
        newStatus: successStatus,
      },
    });

    return NextResponse.json({
      data: updatedInstance!,
      message: `Instance ${action}${action === "stop" ? "ped" : "ed"} successfully`,
    });
  } catch (error) {
    console.error("Instance action error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
