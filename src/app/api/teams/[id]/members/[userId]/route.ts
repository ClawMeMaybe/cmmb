import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  removeTeamMember,
  updateTeamMemberRole,
  checkTeamPermission,
} from "@/server/teams";
import { TeamRole } from "@prisma/client";
import type { ApiResponse } from "@/types";
import type { TeamMember } from "@/types/team";

interface RouteParams {
  params: Promise<{ id: string; userId: string }>;
}

/**
 * @openapi
 * /teams/{id}/members/{userId}:
 *   delete:
 *     summary: Remove member from team
 *     description: Remove a member from the team (requires ADMIN role)
 *     tags:
 *       - Teams
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *       - name: userId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       '200':
 *         description: Member removed successfully
 *       '401':
 *         description: Unauthorized
 *       '403':
 *         description: Forbidden - insufficient permissions
 *       '404':
 *         description: Member not found
 *       '500':
 *         description: Internal server error
 *   put:
 *     summary: Update member role
 *     description: Update a member's role in the team (requires ADMIN role)
 *     tags:
 *       - Teams
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *       - name: userId
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
 *               - role
 *             properties:
 *               role:
 *                 type: string
 *                 enum: [ADMIN, MEMBER]
 *     responses:
 *       '200':
 *         description: Member role updated successfully
 *       '400':
 *         description: Invalid request
 *       '401':
 *         description: Unauthorized
 *       '403':
 *         description: Forbidden - insufficient permissions
 *       '404':
 *         description: Member not found
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

    const { id: teamId, userId } = await params;

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

    // Prevent removing the team owner
    const targetPermission = await checkTeamPermission(
      teamId,
      userId,
      TeamRole.MEMBER
    );
    if (targetPermission.role === TeamRole.OWNER) {
      return NextResponse.json(
        { error: "Cannot remove the team owner" },
        { status: 400 }
      );
    }

    await removeTeamMember(teamId, userId, session.id);

    return NextResponse.json({ message: "Member removed successfully" });
  } catch (error) {
    console.error("Remove team member error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<ApiResponse<TeamMember>>> {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: teamId, userId } = await params;

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
    const { role } = body;

    if (!role) {
      return NextResponse.json({ error: "Role is required" }, { status: 400 });
    }

    // Prevent assigning OWNER role through this endpoint
    if (role === TeamRole.OWNER) {
      return NextResponse.json(
        { error: "Cannot assign OWNER role through this endpoint" },
        { status: 400 }
      );
    }

    // Validate role
    if (role !== TeamRole.ADMIN && role !== TeamRole.MEMBER) {
      return NextResponse.json(
        { error: "Invalid role. Must be ADMIN or MEMBER" },
        { status: 400 }
      );
    }

    const member = await updateTeamMemberRole(
      { teamId, userId, role },
      session.id
    );

    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    return NextResponse.json({
      data: member,
      message: "Member role updated successfully",
    });
  } catch (error) {
    console.error("Update team member role error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
