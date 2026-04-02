import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { addTeamMember, checkTeamPermission } from "@/server/teams";
import { TeamRole } from "@prisma/client";
import type { ApiResponse } from "@/types";
import type { TeamMember } from "@/types/team";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * @openapi
 * /teams/{id}/members:
 *   post:
 *     summary: Add member to team
 *     description: Add a new member to the team (requires ADMIN role)
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
 *               - userId
 *             properties:
 *               userId:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [OWNER, ADMIN, MEMBER]
 *     responses:
 *       '200':
 *         description: Member added successfully
 *       '400':
 *         description: Invalid request
 *       '401':
 *         description: Unauthorized
 *       '403':
 *         description: Forbidden - insufficient permissions
 *       '409':
 *         description: Member already exists
 *       '500':
 *         description: Internal server error
 */

export async function POST(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<ApiResponse<TeamMember>>> {
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
    const { userId, role } = body;

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    // Prevent adding OWNER role through this endpoint
    if (role === TeamRole.OWNER) {
      return NextResponse.json(
        { error: "Cannot assign OWNER role through this endpoint" },
        { status: 400 }
      );
    }

    const member = await addTeamMember({
      teamId,
      userId,
      role: role ?? TeamRole.MEMBER,
    });

    return NextResponse.json({
      data: member,
      message: "Member added successfully",
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes("Unique constraint")) {
      return NextResponse.json(
        { error: "Member already exists in this team" },
        { status: 409 }
      );
    }
    console.error("Add team member error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
