import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST } from "@/app/api/tasks/route";
import { GET as getById, PUT, DELETE } from "@/app/api/tasks/[id]/route";
import { POST as startTask } from "@/app/api/tasks/[id]/start/route";
import { POST as completeTask } from "@/app/api/tasks/[id]/complete/route";
import { POST as cancelTask } from "@/app/api/tasks/[id]/cancel/route";
import { POST as reopenTask } from "@/app/api/tasks/[id]/reopen/route";
import { POST as assignTask } from "@/app/api/tasks/[id]/assign/route";
import { GET as getDeadlineReminders } from "@/app/api/tasks/deadline-reminders/route";

// Mock dependencies
vi.mock("next/headers", () => ({
  cookies: vi.fn(() =>
    Promise.resolve({
      get: vi.fn().mockReturnValue({ value: "test-user-id" }),
      set: vi.fn(),
      delete: vi.fn(),
    })
  ),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    task: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
  },
}));

vi.mock("@/lib/auth", () => ({
  getSession: vi.fn(),
}));

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// Helper to create mock NextRequest
function createRequest(
  url: string,
  options?: { method?: string; body?: unknown }
): NextRequest {
  return new NextRequest(url, {
    method: options?.method ?? "GET",
    headers: options?.body ? { "Content-Type": "application/json" } : {},
    body: options?.body ? JSON.stringify(options.body) : undefined,
  });
}

// Helper to create route params
function createParams(id: string) {
  return Promise.resolve({ id });
}

const mockUser = {
  id: "user-123",
  email: "admin@clawmemaybe.com",
  name: "Admin",
  role: "ADMIN" as const,
  sessionId: "session-admin-123",
};

const mockAssignee = {
  id: "user-456",
  email: "assignee@clawmemaybe.com",
  name: "Assignee",
  role: "VIEWER" as const,
};

const mockTask = {
  id: "task-123",
  title: "Test Task",
  description: "A test task",
  status: "PENDING" as const,
  priority: "MEDIUM" as const,
  deadline: new Date("2024-12-31T00:00:00Z"),
  assigneeId: "user-456",
  createdById: "user-123",
  instanceId: null,
  completedAt: null,
  completedById: null,
  createdAt: new Date("2024-01-01T00:00:00Z"),
  updatedAt: new Date("2024-01-01T00:00:00Z"),
  assignee: mockAssignee,
  createdBy: mockUser,
  instance: null,
  completedBy: null,
};

describe("Tasks API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/tasks", () => {
    it("should return 401 when not authenticated", async () => {
      vi.mocked(getSession).mockResolvedValueOnce(null);

      const response = await GET(createRequest("http://localhost/api/tasks"));
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return list of tasks when authenticated", async () => {
      vi.mocked(getSession).mockResolvedValueOnce(mockUser);
      vi.mocked(prisma.task.findMany).mockResolvedValueOnce([mockTask]);
      vi.mocked(prisma.task.count).mockResolvedValueOnce(1);

      const response = await GET(createRequest("http://localhost/api/tasks"));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.tasks).toHaveLength(1);
      expect(data.data.tasks[0].title).toBe("Test Task");
      expect(data.data.total).toBe(1);
    });

    it("should apply status filter", async () => {
      vi.mocked(getSession).mockResolvedValueOnce(mockUser);
      vi.mocked(prisma.task.findMany).mockResolvedValueOnce([mockTask]);
      vi.mocked(prisma.task.count).mockResolvedValueOnce(1);

      const response = await GET(
        createRequest("http://localhost/api/tasks?status=PENDING")
      );
      void (await response.json());

      expect(response.status).toBe(200);
      expect(prisma.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: { in: ["PENDING"] },
          }),
        })
      );
    });

    it("should apply overdue filter", async () => {
      vi.mocked(getSession).mockResolvedValueOnce(mockUser);
      vi.mocked(prisma.task.findMany).mockResolvedValueOnce([]);
      vi.mocked(prisma.task.count).mockResolvedValueOnce(0);

      const response = await GET(
        createRequest("http://localhost/api/tasks?overdue=true")
      );
      void (await response.json());

      expect(response.status).toBe(200);
      expect(prisma.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: { in: ["PENDING", "IN_PROGRESS"] },
          }),
        })
      );
    });
  });

  describe("POST /api/tasks", () => {
    it("should return 401 when not authenticated", async () => {
      vi.mocked(getSession).mockResolvedValueOnce(null);

      const request = createRequest("http://localhost/api/tasks", {
        method: "POST",
        body: { title: "New Task" },
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 400 when title is missing", async () => {
      vi.mocked(getSession).mockResolvedValueOnce(mockUser);

      const request = createRequest("http://localhost/api/tasks", {
        method: "POST",
        body: { description: "Some description" },
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Title is required");
    });

    it("should create task successfully", async () => {
      vi.mocked(getSession).mockResolvedValueOnce(mockUser);
      vi.mocked(prisma.task.create).mockResolvedValueOnce(mockTask);
      vi.mocked(prisma.auditLog.create).mockResolvedValueOnce({} as never);

      const request = createRequest("http://localhost/api/tasks", {
        method: "POST",
        body: {
          title: "Test Task",
          description: "A test task",
          assigneeId: "user-456",
          deadline: "2024-12-31T00:00:00Z",
        },
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.message).toBe("Task created successfully");
      expect(data.data.title).toBe("Test Task");
    });
  });

  describe("GET /api/tasks/[id]", () => {
    it("should return 401 when not authenticated", async () => {
      vi.mocked(getSession).mockResolvedValueOnce(null);

      const request = createRequest("http://localhost/api/tasks/task-123");
      const response = await getById(request, {
        params: createParams("task-123"),
      });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 404 when task not found", async () => {
      vi.mocked(getSession).mockResolvedValueOnce(mockUser);
      vi.mocked(prisma.task.findUnique).mockResolvedValueOnce(null);

      const request = createRequest("http://localhost/api/tasks/nonexistent");
      const response = await getById(request, {
        params: createParams("nonexistent"),
      });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Task not found");
    });

    it("should return task when found", async () => {
      vi.mocked(getSession).mockResolvedValueOnce(mockUser);
      vi.mocked(prisma.task.findUnique).mockResolvedValueOnce(mockTask);

      const request = createRequest("http://localhost/api/tasks/task-123");
      const response = await getById(request, {
        params: createParams("task-123"),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.title).toBe("Test Task");
    });
  });

  describe("PUT /api/tasks/[id]", () => {
    it("should return 401 when not authenticated", async () => {
      vi.mocked(getSession).mockResolvedValueOnce(null);

      const request = createRequest("http://localhost/api/tasks/task-123", {
        method: "PUT",
        body: { title: "Updated Title" },
      });
      const response = await PUT(request, { params: createParams("task-123") });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 404 when task not found", async () => {
      vi.mocked(getSession).mockResolvedValueOnce(mockUser);
      vi.mocked(prisma.task.findUnique).mockResolvedValueOnce(null);

      const request = createRequest("http://localhost/api/tasks/nonexistent", {
        method: "PUT",
        body: { title: "Updated Title" },
      });
      const response = await PUT(request, {
        params: createParams("nonexistent"),
      });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Task not found");
    });

    it("should update task successfully", async () => {
      vi.mocked(getSession).mockResolvedValueOnce(mockUser);
      vi.mocked(prisma.task.findUnique).mockResolvedValueOnce(mockTask);
      const updatedTask = { ...mockTask, title: "Updated Title" };
      vi.mocked(prisma.task.update).mockResolvedValueOnce(updatedTask);
      vi.mocked(prisma.auditLog.create).mockResolvedValueOnce({} as never);

      const request = createRequest("http://localhost/api/tasks/task-123", {
        method: "PUT",
        body: { title: "Updated Title" },
      });
      const response = await PUT(request, { params: createParams("task-123") });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe("Task updated successfully");
      expect(data.data.title).toBe("Updated Title");
    });
  });

  describe("DELETE /api/tasks/[id]", () => {
    it("should return 401 when not authenticated", async () => {
      vi.mocked(getSession).mockResolvedValueOnce(null);

      const request = createRequest("http://localhost/api/tasks/task-123", {
        method: "DELETE",
      });
      const response = await DELETE(request, {
        params: createParams("task-123"),
      });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 404 when task not found", async () => {
      vi.mocked(getSession).mockResolvedValueOnce(mockUser);
      vi.mocked(prisma.task.findUnique).mockResolvedValueOnce(null);

      const request = createRequest("http://localhost/api/tasks/nonexistent", {
        method: "DELETE",
      });
      const response = await DELETE(request, {
        params: createParams("nonexistent"),
      });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Task not found");
    });

    it("should delete task successfully", async () => {
      vi.mocked(getSession).mockResolvedValueOnce(mockUser);
      vi.mocked(prisma.task.findUnique).mockResolvedValueOnce(mockTask);
      vi.mocked(prisma.task.delete).mockResolvedValueOnce(mockTask);
      vi.mocked(prisma.auditLog.create).mockResolvedValueOnce({} as never);

      const request = createRequest("http://localhost/api/tasks/task-123", {
        method: "DELETE",
      });
      const response = await DELETE(request, {
        params: createParams("task-123"),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe("Task deleted successfully");
      expect(prisma.task.delete).toHaveBeenCalledWith({
        where: { id: "task-123" },
      });
    });
  });

  describe("POST /api/tasks/[id]/start", () => {
    it("should return 401 when not authenticated", async () => {
      vi.mocked(getSession).mockResolvedValueOnce(null);

      const request = createRequest(
        "http://localhost/api/tasks/task-123/start",
        {
          method: "POST",
        }
      );
      const response = await startTask(request, {
        params: createParams("task-123"),
      });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 404 when task not found", async () => {
      vi.mocked(getSession).mockResolvedValueOnce(mockUser);
      vi.mocked(prisma.task.findUnique).mockResolvedValueOnce(null);

      const request = createRequest(
        "http://localhost/api/tasks/nonexistent/start",
        {
          method: "POST",
        }
      );
      const response = await startTask(request, {
        params: createParams("nonexistent"),
      });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Task not found");
    });

    it("should start task successfully", async () => {
      vi.mocked(getSession).mockResolvedValueOnce(mockUser);
      vi.mocked(prisma.task.findUnique).mockResolvedValueOnce(mockTask);
      const startedTask = { ...mockTask, status: "IN_PROGRESS" as const };
      vi.mocked(prisma.task.update).mockResolvedValueOnce(startedTask);
      vi.mocked(prisma.auditLog.create).mockResolvedValueOnce({} as never);

      const request = createRequest(
        "http://localhost/api/tasks/task-123/start",
        {
          method: "POST",
        }
      );
      const response = await startTask(request, {
        params: createParams("task-123"),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe("Task started successfully");
      expect(data.data.status).toBe("IN_PROGRESS");
    });

    it("should return 400 when starting non-pending task", async () => {
      vi.mocked(getSession).mockResolvedValueOnce(mockUser);
      const inProgressTask = { ...mockTask, status: "IN_PROGRESS" as const };
      vi.mocked(prisma.task.findUnique).mockResolvedValueOnce(inProgressTask);

      const request = createRequest(
        "http://localhost/api/tasks/task-123/start",
        {
          method: "POST",
        }
      );
      const response = await startTask(request, {
        params: createParams("task-123"),
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("only be started");
    });
  });

  describe("POST /api/tasks/[id]/complete", () => {
    it("should return 401 when not authenticated", async () => {
      vi.mocked(getSession).mockResolvedValueOnce(null);

      const request = createRequest(
        "http://localhost/api/tasks/task-123/complete",
        {
          method: "POST",
        }
      );
      const response = await completeTask(request, {
        params: createParams("task-123"),
      });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should complete task successfully", async () => {
      vi.mocked(getSession).mockResolvedValueOnce(mockUser);
      vi.mocked(prisma.task.findUnique).mockResolvedValueOnce(mockTask);
      const completedTask = {
        ...mockTask,
        status: "COMPLETED" as const,
        completedAt: new Date(),
        completedById: mockUser.id,
      };
      vi.mocked(prisma.task.update).mockResolvedValueOnce(completedTask);
      vi.mocked(prisma.auditLog.create).mockResolvedValueOnce({} as never);

      const request = createRequest(
        "http://localhost/api/tasks/task-123/complete",
        {
          method: "POST",
          body: { note: "Done" },
        }
      );
      const response = await completeTask(request, {
        params: createParams("task-123"),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe("Task completed successfully");
      expect(data.data.status).toBe("COMPLETED");
    });
  });

  describe("POST /api/tasks/[id]/cancel", () => {
    it("should return 401 when not authenticated", async () => {
      vi.mocked(getSession).mockResolvedValueOnce(null);

      const request = createRequest(
        "http://localhost/api/tasks/task-123/cancel",
        {
          method: "POST",
        }
      );
      const response = await cancelTask(request, {
        params: createParams("task-123"),
      });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should cancel task successfully", async () => {
      vi.mocked(getSession).mockResolvedValueOnce(mockUser);
      vi.mocked(prisma.task.findUnique).mockResolvedValueOnce(mockTask);
      const cancelledTask = { ...mockTask, status: "CANCELLED" as const };
      vi.mocked(prisma.task.update).mockResolvedValueOnce(cancelledTask);
      vi.mocked(prisma.auditLog.create).mockResolvedValueOnce({} as never);

      const request = createRequest(
        "http://localhost/api/tasks/task-123/cancel",
        {
          method: "POST",
          body: { reason: "No longer needed" },
        }
      );
      const response = await cancelTask(request, {
        params: createParams("task-123"),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe("Task cancelled successfully");
      expect(data.data.status).toBe("CANCELLED");
    });

    it("should return 400 when cancelling completed task", async () => {
      vi.mocked(getSession).mockResolvedValueOnce(mockUser);
      const completedTask = { ...mockTask, status: "COMPLETED" as const };
      vi.mocked(prisma.task.findUnique).mockResolvedValueOnce(completedTask);

      const request = createRequest(
        "http://localhost/api/tasks/task-123/cancel",
        {
          method: "POST",
        }
      );
      const response = await cancelTask(request, {
        params: createParams("task-123"),
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("Cannot cancel");
    });
  });

  describe("POST /api/tasks/[id]/reopen", () => {
    it("should return 401 when not authenticated", async () => {
      vi.mocked(getSession).mockResolvedValueOnce(null);

      const request = createRequest(
        "http://localhost/api/tasks/task-123/reopen",
        {
          method: "POST",
        }
      );
      const response = await reopenTask(request, {
        params: createParams("task-123"),
      });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should reopen cancelled task successfully", async () => {
      vi.mocked(getSession).mockResolvedValueOnce(mockUser);
      const cancelledTask = { ...mockTask, status: "CANCELLED" as const };
      vi.mocked(prisma.task.findUnique).mockResolvedValueOnce(cancelledTask);
      const reopenedTask = {
        ...mockTask,
        status: "PENDING" as const,
        completedAt: null,
        completedById: null,
      };
      vi.mocked(prisma.task.update).mockResolvedValueOnce(reopenedTask);
      vi.mocked(prisma.auditLog.create).mockResolvedValueOnce({} as never);

      const request = createRequest(
        "http://localhost/api/tasks/task-123/reopen",
        {
          method: "POST",
        }
      );
      const response = await reopenTask(request, {
        params: createParams("task-123"),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe("Task reopened successfully");
      expect(data.data.status).toBe("PENDING");
    });

    it("should return 400 when reopening pending task", async () => {
      vi.mocked(getSession).mockResolvedValueOnce(mockUser);
      vi.mocked(prisma.task.findUnique).mockResolvedValueOnce(mockTask);

      const request = createRequest(
        "http://localhost/api/tasks/task-123/reopen",
        {
          method: "POST",
        }
      );
      const response = await reopenTask(request, {
        params: createParams("task-123"),
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("Only cancelled or completed");
    });
  });

  describe("POST /api/tasks/[id]/assign", () => {
    it("should return 401 when not authenticated", async () => {
      vi.mocked(getSession).mockResolvedValueOnce(null);

      const request = createRequest(
        "http://localhost/api/tasks/task-123/assign",
        {
          method: "POST",
          body: { assigneeId: "user-789" },
        }
      );
      const response = await assignTask(request, {
        params: createParams("task-123"),
      });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 400 when assigneeId is missing", async () => {
      vi.mocked(getSession).mockResolvedValueOnce(mockUser);

      const request = createRequest(
        "http://localhost/api/tasks/task-123/assign",
        {
          method: "POST",
          body: {},
        }
      );
      const response = await assignTask(request, {
        params: createParams("task-123"),
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("assigneeId is required");
    });

    it("should assign task successfully", async () => {
      vi.mocked(getSession).mockResolvedValueOnce(mockUser);
      vi.mocked(prisma.task.findUnique).mockResolvedValueOnce(mockTask);
      const assignedTask = { ...mockTask, assigneeId: "user-789" };
      vi.mocked(prisma.task.update).mockResolvedValueOnce(assignedTask);
      vi.mocked(prisma.auditLog.create).mockResolvedValueOnce({} as never);

      const request = createRequest(
        "http://localhost/api/tasks/task-123/assign",
        {
          method: "POST",
          body: { assigneeId: "user-789" },
        }
      );
      const response = await assignTask(request, {
        params: createParams("task-123"),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe("Task assigned successfully");
    });

    it("should unassign task successfully", async () => {
      vi.mocked(getSession).mockResolvedValueOnce(mockUser);
      vi.mocked(prisma.task.findUnique).mockResolvedValueOnce(mockTask);
      const unassignedTask = { ...mockTask, assigneeId: null };
      vi.mocked(prisma.task.update).mockResolvedValueOnce(unassignedTask);
      vi.mocked(prisma.auditLog.create).mockResolvedValueOnce({} as never);

      const request = createRequest(
        "http://localhost/api/tasks/task-123/assign",
        {
          method: "POST",
          body: { assigneeId: null },
        }
      );
      const response = await assignTask(request, {
        params: createParams("task-123"),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe("Task unassigned successfully");
    });
  });

  describe("GET /api/tasks/deadline-reminders", () => {
    it("should return 401 when not authenticated", async () => {
      vi.mocked(getSession).mockResolvedValueOnce(null);

      const request = createRequest(
        "http://localhost/api/tasks/deadline-reminders"
      );
      const response = await getDeadlineReminders(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return overdue and approaching tasks", async () => {
      vi.mocked(getSession).mockResolvedValueOnce(mockUser);
      vi.mocked(prisma.task.findMany).mockResolvedValueOnce([mockTask]);
      vi.mocked(prisma.task.findMany).mockResolvedValueOnce([]);

      const request = createRequest(
        "http://localhost/api/tasks/deadline-reminders"
      );
      const response = await getDeadlineReminders(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.overdue).toHaveLength(1);
      expect(data.data.approaching).toHaveLength(0);
    });
  });
});
