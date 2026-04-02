import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  getTeamWithInstances,
  assignInstanceToTeam,
  checkTeamPermission,
} from "@/server/teams";
import { TeamRole } from "@prisma/client";
import type { ApiResponse } from "@/types";
import type { TeamWithInstances } from "@/types/team";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * @openapi
 * /teams/{id}/instances:
 *   get:
 *     summary: Get team instances
 *     description: Retrieve instances assigned to a team
 *     tags:
 *       - Teams
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       '200':
 *         description: List of assigned instances
 *       '401':
 *         description: Unauthorized
 *       '403':
 *         description: Forbidden - not a team member
 *       '404':
 *         description: Team not found
 *       '500':
 *         description: Internal server error
 *   post:
 *     summary: Assign instance to team
 *     description: Assign an instance to the team (requires ADMIN role)
 *     tags:
 *       - Teams
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - instanceId
 *             properties:
 *               instanceId:
 *                 type: string
 *     responses:
 *       '200':
 *         description: Instance assigned successfully
 *       '400':
 *         description: Invalid request
 *       '401':
 *         description: Unauthorized
 *       '403':
 *         description: Forbidden - insufficient permissions
 *       '409':
 *         description: Instance already assigned
 *       '500':
 *         description: Internal server error
 */

export async function GET(
  _request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<ApiResponse<TeamWithInstances>>> {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Check permission - requires MEMBER role
    const permission = await checkTeamPermission(
      id,
      session.id,
      TeamRole.MEMBER
    );
    if (!permission.hasPermission) {
      return NextResponse.json(
        { error: "Forbidden - not a team member" },
        { status: 403 }
      );
    }

    const team = await getTeamWithInstances(id);

    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    return NextResponse.json({ data: team });
  } catch (error) {
    console.error("Get team instances error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: RouteParams
): Promise<
  NextResponse<ApiResponse<{ id: string; instanceId: string; teamId: string }>>
> {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: teamId } = await params;

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

    const body = await request.json();
    const { instanceId } = body;

    if (!instanceId) {
      return NextResponse.json(
        { error: "Instance ID is required" },
        { status: 400 }
      );
    }

    const assignment = await assignInstanceToTeam(
      { instanceId, teamId },
      session.id
    );

    return NextResponse.json({
      data: assignment,
      message: "Instance assigned successfully",
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes("Unique constraint")) {
      return NextResponse.json(
        { error: "Instance already assigned to this team" },
        { status: 409 }
      );
    }
    console.error("Assign instance to team error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
