import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getOverdueTasks, getTasksApproachingDeadline } from "@/server/tasks";
import type { ApiResponse } from "@/types";
import type { TaskWithRelations } from "@/types/task";

/**
 * @openapi
 * /tasks/deadline-reminders:
 *   get:
 *     summary: Get tasks with deadline reminders
 *     description: Retrieve overdue tasks and tasks approaching deadline
 *     tags:
 *       - Tasks
 *     parameters:
 *       - in: query
 *         name: hours
 *         schema:
 *           type: integer
 *           default: 24
 *         description: Hours threshold for approaching deadline tasks
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [overdue, approaching, all]
 *           default: all
 *         description: Filter by reminder type
 *     responses:
 *       '200':
 *         description: Tasks with deadline reminders
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     overdue:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Task'
 *                     approaching:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Task'
 *       '401':
 *         description: Unauthorized
 *       '500':
 *         description: Internal server error
 */

export async function GET(request: NextRequest): Promise<
  NextResponse<
    ApiResponse<{
      overdue: TaskWithRelations[];
      approaching: TaskWithRelations[];
    }>
  >
> {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const hoursParam = searchParams.get("hours");
    const typeParam = searchParams.get("type");

    const hours = hoursParam ? parseInt(hoursParam, 10) : 24;

    let overdue: TaskWithRelations[] = [];
    let approaching: TaskWithRelations[] = [];

    if (typeParam === "overdue" || typeParam === "all" || !typeParam) {
      overdue = await getOverdueTasks();
    }

    if (typeParam === "approaching" || typeParam === "all" || !typeParam) {
      approaching = await getTasksApproachingDeadline(hours);
    }

    return NextResponse.json({
      data: { overdue, approaching },
    });
  } catch (error) {
    console.error("Get deadline reminders error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
