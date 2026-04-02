import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { reopenTask } from "@/server/tasks";
import type { ApiResponse } from "@/types";

/**
 * @openapi
 * /tasks/{id}/reopen:
 *   post:
 *     summary: Reopen a task
 *     description: Reopen a cancelled or completed task back to PENDING status
 *     tags:
 *       - Tasks
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Task ID
 *     responses:
 *       '200':
 *         description: Task reopened successfully
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
 *         description: Only cancelled or completed tasks can be reopened
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
    const task = await reopenTask(id, session.id);

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    return NextResponse.json({
      data: task,
      message: "Task reopened successfully",
    });
  } catch (error) {
    console.error("Reopen task error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Internal server error";
    if (errorMessage.includes("Only cancelled or completed")) {
      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
