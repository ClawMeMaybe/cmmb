import type {
  Task,
  TaskStatus,
  TaskPriority,
  Role,
  InstanceStatus,
} from "@prisma/client";

// Partial user info returned in task queries
export type TaskUserPartial = {
  id: string;
  email: string;
  name: string | null;
  role: Role;
};

// Partial instance info returned in task queries
export type TaskInstancePartial = {
  id: string;
  name: string;
  status: InstanceStatus;
};

// Task with related entities (using partial types for selects)
export type TaskWithRelations = Task & {
  assignee?: TaskUserPartial | null;
  createdBy: TaskUserPartial;
  instance?: TaskInstancePartial | null;
  completedBy?: TaskUserPartial | null;
};

// Task creation input
export interface TaskCreateInput {
  title: string;
  description?: string | null;
  status?: TaskStatus;
  priority?: TaskPriority;
  deadline?: Date | string | null;
  assigneeId?: string | null;
  instanceId?: string | null;
}

// Task update input
export interface TaskUpdateInput {
  title?: string;
  description?: string | null;
  status?: TaskStatus;
  priority?: TaskPriority;
  deadline?: Date | string | null;
  assigneeId?: string | null;
}

// Task filter options for list queries
export interface TaskFilterOptions {
  status?: TaskStatus | TaskStatus[];
  priority?: TaskPriority | TaskPriority[];
  assigneeId?: string | string[];
  createdById?: string | string[];
  instanceId?: string;
  deadlineBefore?: Date | string;
  deadlineAfter?: Date | string;
  overdue?: boolean;
  search?: string;
}

// Task pagination options
export interface TaskPaginationOptions {
  limit?: number;
  offset?: number;
  sortBy?: "createdAt" | "updatedAt" | "deadline" | "priority" | "title";
  sortOrder?: "asc" | "desc";
}

// Task list response with pagination
export interface TaskListResponse {
  tasks: TaskWithRelations[];
  total: number;
  limit: number;
  offset: number;
}

// Task completion request
export interface TaskCompleteInput {
  note?: string;
}

// Task status color mapping for UI
export const TASK_STATUS_COLORS: Record<TaskStatus, string> = {
  PENDING: "#9CA3AF", // Gray
  IN_PROGRESS: "#3B82F6", // Blue
  COMPLETED: "#10B981", // Green
  CANCELLED: "#EF4444", // Red
};

// Task priority color mapping for UI
export const TASK_PRIORITY_COLORS: Record<TaskPriority, string> = {
  LOW: "#9CA3AF", // Gray
  MEDIUM: "#F59E0B", // Amber
  HIGH: "#EF4444", // Red
  URGENT: "#7C3AED", // Purple
};

// Task status labels for UI
export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  PENDING: "Pending",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

// Task priority labels for UI
export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  URGENT: "Urgent",
};

// Default pagination settings
export const DEFAULT_TASK_LIMIT = 20;
export const MAX_TASK_LIMIT = 100;
