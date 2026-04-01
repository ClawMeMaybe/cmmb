import { NextResponse } from "next/server";
import { getSession, getUserSessions } from "@/lib/auth";
import type { ApiResponse } from "@/types";

type SessionInfo = {
  id: string;
  userAgent: string | null;
  ipAddress: string | null;
  createdAt: string;
  lastAccessed: string;
  expiresAt: string;
  isCurrent: boolean;
};

/**
 * @openapi
 * /auth/sessions:
 *   get:
 *     summary: Get user sessions
 *     description: Retrieve all active sessions for the current user
 *     tags:
 *       - Authentication
 *     responses:
 *       '200':
 *         description: List of user sessions
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     sessions:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           userAgent:
 *                             type: string
 *                             nullable: true
 *                           ipAddress:
 *                             type: string
 *                             nullable: true
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *                           lastAccessed:
 *                             type: string
 *                             format: date-time
 *                           expiresAt:
 *                             type: string
 *                             format: date-time
 *                           isCurrent:
 *                             type: boolean
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

export async function GET(): Promise<
  NextResponse<ApiResponse<{ sessions: SessionInfo[] }>>
> {
  try {
    const user = await getSession();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sessions = await getUserSessions(user.id);

    return NextResponse.json({
      data: {
        sessions: sessions.map((s) => ({
          id: s.id,
          userAgent: s.userAgent,
          ipAddress: s.ipAddress,
          createdAt: s.createdAt.toISOString(),
          lastAccessed: s.lastAccessed.toISOString(),
          expiresAt: s.expiresAt.toISOString(),
          isCurrent: s.isCurrent,
        })),
      },
    });
  } catch (error) {
    console.error("Get sessions error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
