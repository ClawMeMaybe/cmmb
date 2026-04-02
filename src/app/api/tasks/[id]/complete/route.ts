import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { completeTask } from "@/server/tasks";
import type { ApiResponse } from "@/types";

/**
 * @openapi
 * /tasks/{id}/complete:
 *   post:
 *     summary: Complete a task
 *     description: Mark task as completed and record completion time
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
 *               note:
 *                 type: string
 *                 description: Optional completion note
 *     responses:
 *       '200':
 *         description: Task completed successfully
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
 *         description: Invalid status transition
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
    const { note } = body;

    const task = await completeTask(id, session.id, note);

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    return NextResponse.json({
      data: task,
      message: "Task completed successfully",
    });
  } catch (error) {
    console.error("Complete task error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Internal server error";
    if (errorMessage.includes("only be completed")) {
      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
