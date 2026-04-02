import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getTeamsWithMembers, createTeam } from "@/server/teams";
import type { ApiResponse, TeamWithMembers } from "@/types";

/**
 * @openapi
 * /teams:
 *   get:
 *     summary: Get all teams
 *     description: Retrieve list of all teams with their members
 *     tags:
 *       - Teams
 *     responses:
 *       '200':
 *         description: List of teams
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/TeamWithMembers'
 *       '401':
 *         description: Unauthorized
 *       '500':
 *         description: Internal server error
 *   post:
 *     summary: Create a team
 *     description: Create a new team with optional initial members
 *     tags:
 *       - Teams
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateTeamRequest'
 *     responses:
 *       '201':
 *         description: Team created successfully
 *       '400':
 *         description: Invalid request
 *       '401':
 *         description: Unauthorized
 *       '409':
 *         description: Team name already exists
 *       '500':
 *         description: Internal server error
 */

export async function GET(): Promise<
  NextResponse<ApiResponse<TeamWithMembers[]>>
> {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const teams = await getTeamsWithMembers();
    return NextResponse.json({ data: teams });
  } catch (error) {
    console.error("Get teams error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest
): Promise<NextResponse<ApiResponse<TeamWithMembers>>> {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, initialMembers } = body;

    if (!name) {
      return NextResponse.json(
        { error: "Team name is required" },
        { status: 400 }
      );
    }

    const team = await createTeam({
      name,
      description,
      ownerId: session.id,
      initialMembers,
    });

    return NextResponse.json(
      {
        data: team as TeamWithMembers,
        message: "Team created successfully",
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof Error && error.message.includes("Unique constraint")) {
      return NextResponse.json(
        { error: "Team name already exists" },
        { status: 409 }
      );
    }
    console.error("Create team error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
