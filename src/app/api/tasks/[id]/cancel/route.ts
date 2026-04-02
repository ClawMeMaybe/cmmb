import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { cancelTask } from "@/server/tasks";
import type { ApiResponse } from "@/types";

/**
 * @openapi
 * /tasks/{id}/cancel:
 *   post:
 *     summary: Cancel a task
 *     description: Mark task as cancelled with optional reason
 *     tags:
 *       - Tasks
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Task ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *                 description: Optional cancellation reason
 *     responses:
 *       '200':
 *         description: Task cancelled successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/Task'
 *                 message:
 *                   type: string
 *       '400':
 *         description: Cannot cancel completed task
 *       '401':
 *         description: Unauthorized
 *       '404':
 *         description: Task not found
 *       '500':
 *         description: Internal server error
 */

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<unknown>>> {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const { reason } = body;

    const task = await cancelTask(id, session.id, reason);

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    return NextResponse.json({
      data: task,
      message: "Task cancelled successfully",
    });
  } catch (error) {
    console.error("Cancel task error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Internal server error";
    if (errorMessage.includes("Cannot cancel")) {
      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
