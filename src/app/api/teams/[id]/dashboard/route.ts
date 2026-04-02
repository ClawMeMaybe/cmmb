import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getTeamDashboardStats, checkTeamPermission } from "@/server/teams";
import { TeamRole } from "@prisma/client";
import type { ApiResponse } from "@/types";
import type { TeamDashboardStats } from "@/types/team";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * @openapi
 * /teams/{id}/dashboard:
 *   get:
 *     summary: Get team dashboard stats
 *     description: Retrieve dashboard statistics for a team (requires MEMBER role)
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
 *         description: Team dashboard statistics
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TeamDashboardStats'
 *       '401':
 *         description: Unauthorized
 *       '403':
 *         description: Forbidden - not a team member
 *       '404':
 *         description: Team not found
 *       '500':
 *         description: Internal server error
 */

export async function GET(
  _request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<ApiResponse<TeamDashboardStats>>> {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Check permission - requires MEMBER role (any team member can view dashboard)
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

    const stats = await getTeamDashboardStats(id);

    if (!stats) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    return NextResponse.json({ data: stats });
  } catch (error) {
    console.error("Get team dashboard error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
