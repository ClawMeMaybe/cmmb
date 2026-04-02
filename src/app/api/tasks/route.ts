import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getTasks, createTask } from "@/server/tasks";
import type { ApiResponse, TaskStatus, TaskPriority } from "@/types";
import type { TaskListResponse } from "@/types/task";

/**
 * @openapi
 * /tasks:
 *   get:
 *     summary: Get task list
 *     description: Retrieve all tasks with optional filtering and pagination
 *     tags:
 *       - Tasks
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, IN_PROGRESS, COMPLETED, CANCELLED]
 *         description: Filter by status (comma-separated for multiple)
 *       - in: query
 *         name: priority
 *         schema:
 *           type: string
 *           enum: [LOW, MEDIUM, HIGH, URGENT]
 *         description: Filter by priority (comma-separated for multiple)
 *       - in: query
 *         name: assigneeId
 *         schema:
 *           type: string
 *         description: Filter by assignee ID (comma-separated for multiple)
 *       - in: query
 *         name: instanceId
 *         schema:
 *           type: string
 *         description: Filter by instance ID
 *       - in: query
 *         name: overdue
 *         schema:
 *           type: boolean
 *         description: Filter only overdue tasks
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in title and description
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Number of results per page
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Offset for pagination
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [createdAt, updatedAt, deadline, priority, title]
 *         description: Sort field
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *         description: Sort direction
 *     responses:
 *       '200':
 *         description: List of tasks
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     tasks:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Task'
 *                     total:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     offset:
 *                       type: integer
 *       '401':
 *         description: Unauthorized
 *       '500':
 *         description: Internal server error
 *   post:
 *     summary: Create a new task
 *     description: Create a new task with optional assignee and deadline
 *     tags:
 *       - Tasks
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateTaskRequest'
 *     responses:
 *       '201':
 *         description: Task created successfully
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
 *         description: Missing required fields
 *       '401':
 *         description: Unauthorized
 *       '500':
 *         description: Internal server error
 */

export async function GET(
  request: NextRequest
): Promise<NextResponse<ApiResponse<TaskListResponse>>> {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);

    // Parse filter parameters
    const statusParam = searchParams.get("status");
    const priorityParam = searchParams.get("priority");
    const assigneeIdParam = searchParams.get("assigneeId");
    const createdByIdParam = searchParams.get("createdById");
    const instanceIdParam = searchParams.get("instanceId");
    const deadlineBeforeParam = searchParams.get("deadlineBefore");
    const deadlineAfterParam = searchParams.get("deadlineAfter");
    const overdueParam = searchParams.get("overdue");
    const searchParam = searchParams.get("search");

    // Parse pagination parameters
    const limitParam = searchParams.get("limit");
    const offsetParam = searchParams.get("offset");
    const sortByParam = searchParams.get("sortBy");
    const sortOrderParam = searchParams.get("sortOrder");

    const result = await getTasks({
      filters: {
        status: statusParam
          ? (statusParam.split(",") as TaskStatus[])
          : undefined,
        priority: priorityParam
          ? (priorityParam.split(",") as TaskPriority[])
          : undefined,
        assigneeId: assigneeIdParam ? assigneeIdParam.split(",") : undefined,
        createdById: createdByIdParam ? createdByIdParam.split(",") : undefined,
        instanceId: instanceIdParam ?? undefined,
        deadlineBefore: deadlineBeforeParam ?? undefined,
        deadlineAfter: deadlineAfterParam ?? undefined,
        overdue: overdueParam === "true",
        search: searchParam ?? undefined,
      },
      pagination: {
        limit: limitParam ? parseInt(limitParam, 10) : undefined,
        offset: offsetParam ? parseInt(offsetParam, 10) : undefined,
        sortBy: sortByParam as
          | "createdAt"
          | "updatedAt"
          | "deadline"
          | "priority"
          | "title"
          | undefined,
        sortOrder: sortOrderParam as "asc" | "desc" | undefined,
      },
    });

    return NextResponse.json({ data: result });
  } catch (error) {
    console.error("Get tasks error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest
): Promise<NextResponse<ApiResponse<unknown>>> {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      title,
      description,
      status,
      priority,
      deadline,
      assigneeId,
      instanceId,
    } = body;

    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    const task = await createTask(
      {
        title,
        description,
        status,
        priority,
        deadline,
        assigneeId,
        instanceId,
      },
      session.id
    );

    return NextResponse.json(
      { data: task, message: "Task created successfully" },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create task error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
