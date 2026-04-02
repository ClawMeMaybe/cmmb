import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { assignTask } from "@/server/tasks";
import type { ApiResponse } from "@/types";

/**
 * @openapi
 * /tasks/{id}/assign:
 *   post:
 *     summary: Assign a task
 *     description: Assign or reassign a task to a user, or unassign by providing null assigneeId
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
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               assigneeId:
 *                 type: string
 *                 nullable: true
 *                 description: User ID to assign task to, or null to unassign
 *     responses:
 *       '200':
 *         description: Task assigned successfully
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
 *         description: Missing assigneeId in body
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
    const body = await request.json();

    if (body.assigneeId === undefined) {
      return NextResponse.json(
        { error: "assigneeId is required (can be null to unassign)" },
        { status: 400 }
      );
    }

    const task = await assignTask(id, body.assigneeId, session.id);

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const message = body.assigneeId
      ? "Task assigned successfully"
      : "Task unassigned successfully";

    return NextResponse.json({
      data: task,
      message,
    });
  } catch (error) {
    console.error("Assign task error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
