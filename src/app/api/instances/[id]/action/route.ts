import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getInstanceById, updateInstance } from "@/server/instances";
import { createGatewayClient, type InstanceAction } from "@/lib/gateway";
import { createAuditLog, AuditActions, EntityTypes } from "@/lib/audit";
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
 * Map action string to AuditAction
 */
const actionToAuditAction: Record<InstanceAction, string> = {
  start: AuditActions.START_INSTANCE,
  stop: AuditActions.STOP_INSTANCE,
  restart: AuditActions.RESTART_INSTANCE,
};
const actionStatusMap: Record<
  InstanceAction,
  { pending: InstanceStatus; success: InstanceStatus }
> = {
  start: { pending: InstanceStatus.STARTING, success: InstanceStatus.ONLINE },
  stop: { pending: InstanceStatus.STOPPING, success: InstanceStatus.OFFLINE },
  restart: { pending: InstanceStatus.STARTING, success: InstanceStatus.ONLINE },
};

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
        action: actionToAuditAction[action],
        entityType: EntityTypes.INSTANCE,
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
      action: actionToAuditAction[action],
      entityType: EntityTypes.INSTANCE,
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
