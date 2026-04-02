import { prisma } from "@/lib/prisma";
import type { Task, AuditLog } from "@prisma/client";
import type {
  TaskWithRelations,
  TaskCreateInput,
  TaskUpdateInput,
  TaskFilterOptions,
  TaskPaginationOptions,
  TaskListResponse,
} from "@/types";
import { DEFAULT_TASK_LIMIT, MAX_TASK_LIMIT } from "@/types";

/**
 * Get all tasks with optional filtering and pagination
 */
export async function getTasks(options?: {
  filters?: TaskFilterOptions;
  pagination?: TaskPaginationOptions;
}): Promise<TaskListResponse> {
  const { filters, pagination } = options ?? {};

  // Build where clause from filters
  const where: Record<string, unknown> = {};

  if (filters?.status) {
    if (Array.isArray(filters.status)) {
      where.status = { in: filters.status };
    } else {
      where.status = filters.status;
    }
  }

  if (filters?.priority) {
    if (Array.isArray(filters.priority)) {
      where.priority = { in: filters.priority };
    } else {
      where.priority = filters.priority;
    }
  }

  if (filters?.assigneeId) {
    if (Array.isArray(filters.assigneeId)) {
      where.assigneeId = { in: filters.assigneeId };
    } else {
      where.assigneeId = filters.assigneeId;
    }
  }

  if (filters?.createdById) {
    if (Array.isArray(filters.createdById)) {
      where.createdById = { in: filters.createdById };
    } else {
      where.createdById = filters.createdById;
    }
  }

  if (filters?.instanceId) {
    where.instanceId = filters.instanceId;
  }

  if (filters?.deadlineBefore) {
    where.deadline = {
      ...(where.deadline as object),
      lt: new Date(filters.deadlineBefore),
    };
  }

  if (filters?.deadlineAfter) {
    where.deadline = {
      ...(where.deadline as object),
      gt: new Date(filters.deadlineAfter),
    };
  }

  // Overdue filter: deadline is past and status is not COMPLETED or CANCELLED
  if (filters?.overdue) {
    where.deadline = { lt: new Date() };
    where.status = { in: ["PENDING", "IN_PROGRESS"] };
  }

  // Search filter (search in title and description)
  if (filters?.search) {
    where.OR = [
      { title: { contains: filters.search, mode: "insensitive" } },
      { description: { contains: filters.search, mode: "insensitive" } },
    ];
  }

  // Build pagination and sorting
  const limit = Math.min(
    pagination?.limit ?? DEFAULT_TASK_LIMIT,
    MAX_TASK_LIMIT
  );
  const offset = pagination?.offset ?? 0;
  const sortBy = pagination?.sortBy ?? "createdAt";
  const sortOrder = pagination?.sortOrder ?? "desc";

  // Get total count
  const total = await prisma.task.count({ where });

  // Get tasks with relations
  const tasks = await prisma.task.findMany({
    where,
    orderBy: { [sortBy]: sortOrder },
    take: limit,
    skip: offset,
    include: {
      assignee: {
        select: { id: true, email: true, name: true, role: true },
      },
      createdBy: {
        select: { id: true, email: true, name: true, role: true },
      },
      instance: {
        select: { id: true, name: true, status: true },
      },
      completedBy: {
        select: { id: true, email: true, name: true, role: true },
      },
    },
  });

  return { tasks, total, limit, offset };
}

/**
 * Get a single task by ID with relations
 */
export async function getTaskById(
  id: string
): Promise<TaskWithRelations | null> {
  const task = await prisma.task.findUnique({
    where: { id },
    include: {
      assignee: {
        select: { id: true, email: true, name: true, role: true },
      },
      createdBy: {
        select: { id: true, email: true, name: true, role: true },
      },
      instance: {
        select: { id: true, name: true, status: true, gatewayUrl: true },
      },
      completedBy: {
        select: { id: true, email: true, name: true, role: true },
      },
    },
  });

  return task;
}

/**
 * Create a new task
 */
export async function createTask(
  data: TaskCreateInput,
  userId: string
): Promise<Task> {
  const task = await prisma.task.create({
    data: {
      title: data.title,
      description: data.description ?? null,
      status: data.status ?? "PENDING",
      priority: data.priority ?? "MEDIUM",
      deadline: data.deadline ? new Date(data.deadline) : null,
      assigneeId: data.assigneeId ?? null,
      createdById: userId,
      instanceId: data.instanceId ?? null,
    },
    include: {
      assignee: true,
      createdBy: true,
      instance: true,
    },
  });

  // Create audit log
  await createTaskAuditLog({
    action: "CREATE_TASK",
    taskId: task.id,
    userId,
    details: {
      title: task.title,
      assigneeId: task.assigneeId,
      deadline: task.deadline,
      priority: task.priority,
    },
  });

  return task;
}

/**
 * Update an existing task
 */
export async function updateTask(
  id: string,
  data: TaskUpdateInput,
  userId: string
): Promise<Task | null> {
  // First verify the task exists
  const existingTask = await prisma.task.findUnique({ where: { id } });
  if (!existingTask) {
    return null;
  }

  // Build update data
  const updateData: Record<string, unknown> = {};

  if (data.title !== undefined) updateData.title = data.title;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.status !== undefined) updateData.status = data.status;
  if (data.priority !== undefined) updateData.priority = data.priority;
  if (data.deadline !== undefined)
    updateData.deadline = data.deadline ? new Date(data.deadline) : null;
  if (data.assigneeId !== undefined) updateData.assigneeId = data.assigneeId;

  const task = await prisma.task.update({
    where: { id },
    data: updateData,
    include: {
      assignee: true,
      createdBy: true,
      instance: true,
    },
  });

  // Create audit log
  await createTaskAuditLog({
    action: "UPDATE_TASK",
    taskId: id,
    userId,
    details: {
      changes: data,
      previousStatus: existingTask.status,
      newStatus: task.status,
    },
  });

  return task;
}

/**
 * Start working on a task (change status to IN_PROGRESS)
 */
export async function startTask(
  id: string,
  userId: string
): Promise<Task | null> {
  const task = await prisma.task.findUnique({ where: { id } });
  if (!task) {
    return null;
  }

  if (task.status !== "PENDING") {
    throw new Error("Task can only be started from PENDING status");
  }

  const updatedTask = await prisma.task.update({
    where: { id },
    data: { status: "IN_PROGRESS" },
    include: {
      assignee: true,
      createdBy: true,
      instance: true,
    },
  });

  await createTaskAuditLog({
    action: "START_TASK",
    taskId: id,
    userId,
    details: { previousStatus: "PENDING", newStatus: "IN_PROGRESS" },
  });

  return updatedTask;
}

/**
 * Complete a task
 */
export async function completeTask(
  id: string,
  userId: string,
  note?: string
): Promise<Task | null> {
  const task = await prisma.task.findUnique({ where: { id } });
  if (!task) {
    return null;
  }

  if (task.status !== "PENDING" && task.status !== "IN_PROGRESS") {
    throw new Error(
      "Task can only be completed from PENDING or IN_PROGRESS status"
    );
  }

  const updatedTask = await prisma.task.update({
    where: { id },
    data: {
      status: "COMPLETED",
      completedAt: new Date(),
      completedById: userId,
    },
    include: {
      assignee: true,
      createdBy: true,
      instance: true,
      completedBy: true,
    },
  });

  await createTaskAuditLog({
    action: "COMPLETE_TASK",
    taskId: id,
    userId,
    details: {
      previousStatus: task.status,
      newStatus: "COMPLETED",
      note,
      completedAt: updatedTask.completedAt,
    },
  });

  return updatedTask;
}

/**
 * Cancel a task
 */
export async function cancelTask(
  id: string,
  userId: string,
  reason?: string
): Promise<Task | null> {
  const task = await prisma.task.findUnique({ where: { id } });
  if (!task) {
    return null;
  }

  if (task.status === "COMPLETED") {
    throw new Error("Cannot cancel a completed task");
  }

  const updatedTask = await prisma.task.update({
    where: { id },
    data: { status: "CANCELLED" },
    include: {
      assignee: true,
      createdBy: true,
      instance: true,
    },
  });

  await createTaskAuditLog({
    action: "CANCEL_TASK",
    taskId: id,
    userId,
    details: {
      previousStatus: task.status,
      newStatus: "CANCELLED",
      reason,
    },
  });

  return updatedTask;
}

/**
 * Reopen a cancelled or completed task
 */
export async function reopenTask(
  id: string,
  userId: string
): Promise<Task | null> {
  const task = await prisma.task.findUnique({ where: { id } });
  if (!task) {
    return null;
  }

  if (task.status !== "CANCELLED" && task.status !== "COMPLETED") {
    throw new Error("Only cancelled or completed tasks can be reopened");
  }

  const updatedTask = await prisma.task.update({
    where: { id },
    data: {
      status: "PENDING",
      completedAt: null,
      completedById: null,
    },
    include: {
      assignee: true,
      createdBy: true,
      instance: true,
    },
  });

  await createTaskAuditLog({
    action: "REOPEN_TASK",
    taskId: id,
    userId,
    details: {
      previousStatus: task.status,
      newStatus: "PENDING",
    },
  });

  return updatedTask;
}

/**
 * Delete a task
 */
export async function deleteTask(id: string, userId: string): Promise<boolean> {
  const task = await prisma.task.findUnique({ where: { id } });
  if (!task) {
    return false;
  }

  await prisma.task.delete({ where: { id } });

  await createTaskAuditLog({
    action: "DELETE_TASK",
    taskId: id,
    userId,
    details: { title: task.title },
  });

  return true;
}

/**
 * Assign a task to a user
 */
export async function assignTask(
  id: string,
  assigneeId: string | null,
  userId: string
): Promise<Task | null> {
  const task = await prisma.task.findUnique({ where: { id } });
  if (!task) {
    return null;
  }

  const updatedTask = await prisma.task.update({
    where: { id },
    data: { assigneeId },
    include: {
      assignee: true,
      createdBy: true,
      instance: true,
    },
  });

  await createTaskAuditLog({
    action: "ASSIGN_TASK",
    taskId: id,
    userId,
    details: {
      previousAssigneeId: task.assigneeId,
      newAssigneeId: assigneeId,
    },
  });

  return updatedTask;
}

/**
 * Get tasks that are overdue (deadline passed and not completed/cancelled)
 */
export async function getOverdueTasks(): Promise<TaskWithRelations[]> {
  return prisma.task.findMany({
    where: {
      deadline: { lt: new Date() },
      status: { in: ["PENDING", "IN_PROGRESS"] },
    },
    orderBy: { deadline: "asc" },
    include: {
      assignee: {
        select: { id: true, email: true, name: true, role: true },
      },
      createdBy: {
        select: { id: true, email: true, name: true, role: true },
      },
      instance: {
        select: { id: true, name: true, status: true },
      },
      completedBy: {
        select: { id: true, email: true, name: true, role: true },
      },
    },
  });
}

/**
 * Get tasks approaching deadline (within the next N hours)
 */
export async function getTasksApproachingDeadline(
  hours: number = 24
): Promise<TaskWithRelations[]> {
  const deadlineThreshold = new Date(Date.now() + hours * 60 * 60 * 1000);

  return prisma.task.findMany({
    where: {
      deadline: {
        gt: new Date(),
        lt: deadlineThreshold,
      },
      status: { in: ["PENDING", "IN_PROGRESS"] },
    },
    orderBy: { deadline: "asc" },
    include: {
      assignee: {
        select: { id: true, email: true, name: true, role: true },
      },
      createdBy: {
        select: { id: true, email: true, name: true, role: true },
      },
      instance: {
        select: { id: true, name: true, status: true },
      },
      completedBy: {
        select: { id: true, email: true, name: true, role: true },
      },
    },
  });
}

/**
 * Create an audit log for task actions
 */
export async function createTaskAuditLog(data: {
  action: string;
  taskId: string;
  userId: string;
  details?: Record<string, unknown>;
}): Promise<AuditLog> {
  return prisma.auditLog.create({
    data: {
      action: data.action,
      entityType: "Task",
      entityId: data.taskId,
      userId: data.userId,
      taskId: data.taskId,
      details: data.details ? JSON.parse(JSON.stringify(data.details)) : null,
    },
  });
}
