import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { startTask } from "@/server/tasks";
import type { ApiResponse } from "@/types";

/**
 * @openapi
 * /tasks/{id}/start:
 *   post:
 *     summary: Start working on a task
 *     description: Change task status from PENDING to IN_PROGRESS
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
 *         description: Task started successfully
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
    const task = await startTask(id, session.id);

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    return NextResponse.json({
      data: task,
      message: "Task started successfully",
    });
  } catch (error) {
    console.error("Start task error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Internal server error";
    if (errorMessage.includes("only be started")) {
      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
