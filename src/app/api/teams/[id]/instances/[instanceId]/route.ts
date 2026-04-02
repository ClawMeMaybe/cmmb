import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { unassignInstanceFromTeam, checkTeamPermission } from "@/server/teams";
import { TeamRole } from "@prisma/client";
import type { ApiResponse } from "@/types";

interface RouteParams {
  params: Promise<{ id: string; instanceId: string }>;
}

/**
 * @openapi
 * /teams/{id}/instances/{instanceId}:
 *   delete:
 *     summary: Unassign instance from team
 *     description: Remove an instance assignment from the team (requires ADMIN role)
 *     tags:
 *       - Teams
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *       - name: instanceId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       '200':
 *         description: Instance unassigned successfully
 *       '401':
 *         description: Unauthorized
 *       '403':
 *         description: Forbidden - insufficient permissions
 *       '404':
 *         description: Assignment not found
 *       '500':
 *         description: Internal server error
 */

export async function DELETE(
  _request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<ApiResponse<null>>> {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: teamId, instanceId } = await params;

    // Check permission - requires ADMIN role
    const permission = await checkTeamPermission(
      teamId,
      session.id,
      TeamRole.ADMIN
    );
    if (!permission.hasPermission) {
      return NextResponse.json(
        { error: "Forbidden - insufficient permissions" },
        { status: 403 }
      );
    }

    await unassignInstanceFromTeam(instanceId, teamId, session.id);

    return NextResponse.json({ message: "Instance unassigned successfully" });
  } catch (error) {
    console.error("Unassign instance from team error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
