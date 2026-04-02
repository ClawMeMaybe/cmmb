import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  getTeamWithMembers,
  updateTeam,
  deleteTeam,
  checkTeamPermission,
} from "@/server/teams";
import { TeamRole } from "@prisma/client";
import type { ApiResponse, TeamWithMembers, Team } from "@/types";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * @openapi
 * /teams/{id}:
 *   get:
 *     summary: Get team details
 *     description: Retrieve details of a specific team with members
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
 *         description: Team details
 *       '401':
 *         description: Unauthorized
 *       '404':
 *         description: Team not found
 *       '500':
 *         description: Internal server error
 *   put:
 *     summary: Update team
 *     description: Update team name or description (requires ADMIN role)
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
 *             $ref: '#/components/schemas/UpdateTeamRequest'
 *     responses:
 *       '200':
 *         description: Team updated successfully
 *       '401':
 *         description: Unauthorized
 *       '403':
 *         description: Forbidden - insufficient permissions
 *       '404':
 *         description: Team not found
 *       '500':
 *         description: Internal server error
 *   delete:
 *     summary: Delete team
 *     description: Delete a team (requires OWNER role)
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
 *         description: Team deleted successfully
 *       '401':
 *         description: Unauthorized
 *       '403':
 *         description: Forbidden - insufficient permissions
 *       '404':
 *         description: Team not found
 *       '500':
 *         description: Internal server error
 */

export async function GET(
  _request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<ApiResponse<TeamWithMembers>>> {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const team = await getTeamWithMembers(id);

    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    return NextResponse.json({ data: team });
  } catch (error) {
    console.error("Get team error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<ApiResponse<Team>>> {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Check permission - requires ADMIN role
    const permission = await checkTeamPermission(
      id,
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
    const { name, description } = body;

    if (!name && !description) {
      return NextResponse.json(
        { error: "At least one field (name or description) is required" },
        { status: 400 }
      );
    }

    const team = await updateTeam(id, { name, description }, session.id);

    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    return NextResponse.json({
      data: team,
      message: "Team updated successfully",
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes("Unique constraint")) {
      return NextResponse.json(
        { error: "Team name already exists" },
        { status: 409 }
      );
    }
    console.error("Update team error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<ApiResponse<null>>> {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Check permission - requires OWNER role
    const permission = await checkTeamPermission(
      id,
      session.id,
      TeamRole.OWNER
    );
    if (!permission.hasPermission) {
      return NextResponse.json(
        { error: "Forbidden - only team owner can delete the team" },
        { status: 403 }
      );
    }

    await deleteTeam(id, session.id);

    return NextResponse.json({ message: "Team deleted successfully" });
  } catch (error) {
    console.error("Delete team error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
