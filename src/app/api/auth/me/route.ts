import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import type { ApiResponse } from "@/types";

/**
 * @openapi
 * /auth/me:
 *   get:
 *     summary: Get current user
 *     description: Retrieve the currently authenticated user's information
 *     tags:
 *       - Authentication
 *     responses:
 *       '200':
 *         description: Current user information
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         email:
 *                           type: string
 *                         name:
 *                           type: string
 *                           nullable: true
 *                         role:
 *                           type: string
 *                           enum: ["ADMIN", "VIEWER"]
 *                         sessionId:
 *                           type: string
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
  NextResponse<
    ApiResponse<{
      user: {
        id: string;
        email: string;
        name: string | null;
        role: "ADMIN" | "VIEWER";
        sessionId: string;
      };
    }>
  >
> {
  try {
    const user = await getSession();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json({
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          sessionId: user.sessionId,
        },
      },
    });
  } catch (error) {
    console.error("Get current user error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
