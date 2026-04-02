import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET as getFiles } from "@/app/api/workspace/files/route";
import {
  GET as getFile,
  PUT as putFile,
  DELETE as deleteFile,
} from "@/app/api/workspace/files/[path]/route";
import {
  GET as getMemory,
  POST as postMemory,
} from "@/app/api/workspace/memory/route";
import {
  GET as getMemoryByName,
  PUT as putMemoryByName,
  DELETE as deleteMemoryByName,
} from "@/app/api/workspace/memory/[name]/route";
import {
  GET as getBackups,
  POST as postBackup,
} from "@/app/api/workspace/backups/route";
import {
  GET as getBackup,
  DELETE as deleteBackup,
} from "@/app/api/workspace/backups/[id]/route";
import { POST as restoreBackup } from "@/app/api/workspace/backups/[id]/restore/route";
import { NextRequest } from "next/server";

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
    workspaceBackup: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
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

vi.mock("@/server/workspace", () => ({
  listWorkspaceFiles: vi.fn(),
  getWorkspaceStats: vi.fn(),
  readWorkspaceFile: vi.fn(),
  writeWorkspaceFile: vi.fn(),
  deleteWorkspaceFile: vi.fn(),
  listMemoryEntries: vi.fn(),
  createMemoryEntry: vi.fn(),
  getMemoryEntry: vi.fn(),
  updateMemoryEntry: vi.fn(),
  deleteMemoryEntry: vi.fn(),
  listWorkspaceBackups: vi.fn(),
  createWorkspaceBackup: vi.fn(),
  getWorkspaceBackup: vi.fn(),
  deleteWorkspaceBackup: vi.fn(),
  restoreWorkspaceBackup: vi.fn(),
}));

import { getSession } from "@/lib/auth";
import {
  listWorkspaceFiles,
  getWorkspaceStats,
  readWorkspaceFile,
  writeWorkspaceFile,
  deleteWorkspaceFile,
  listMemoryEntries,
  createMemoryEntry,
  getMemoryEntry,
  updateMemoryEntry,
  deleteMemoryEntry,
  listWorkspaceBackups,
  createWorkspaceBackup,
  getWorkspaceBackup,
  deleteWorkspaceBackup,
  restoreWorkspaceBackup,
} from "@/server/workspace";

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

function createIdParams(id: string) {
  return Promise.resolve({ id });
}

function createPathParams(path: string) {
  return Promise.resolve({ path });
}

function createNameParams(name: string) {
  return Promise.resolve({ name });
}

const mockAdminUser = {
  id: "user-123",
  email: "admin@clawmemaybe.com",
  name: "Admin",
  role: "ADMIN" as const,
  sessionId: "session-admin-123",
};

const mockViewerUser = {
  id: "user-456",
  email: "viewer@clawmemaybe.com",
  name: "Viewer",
  role: "VIEWER" as const,
  sessionId: "session-viewer-456",
};

const mockWorkspaceFile = {
  name: "test.md",
  path: "workspace/test.md",
  type: "file" as const,
  size: 100,
  modifiedAt: "2024-01-01T00:00:00Z",
};

const mockWorkspaceFileContent = {
  content: "# Test Content",
  path: "workspace/test.md",
  modifiedAt: "2024-01-01T00:00:00Z",
};

const mockMemoryEntry = {
  name: "test-memory",
  path: "memory/project/test-memory.md",
  type: "project" as const,
  description: "Test memory entry",
  content: "This is test content",
  updatedAt: "2024-01-01T00:00:00Z",
};

const mockBackup = {
  id: "backup-123",
  name: "Test Backup",
  description: "A test backup",
  filePath: "/backups/test.tar.gz",
  size: 1024,
  createdAt: new Date("2024-01-01T00:00:00Z"),
  createdById: "user-123",
  createdBy: {
    id: "user-123",
    name: "Admin",
    email: "admin@clawmemaybe.com",
  },
};

describe("Workspace Files API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/workspace/files", () => {
    it("should return 401 when not authenticated", async () => {
      vi.mocked(getSession).mockResolvedValueOnce(null);

      const response = await getFiles(
        createRequest("http://localhost/api/workspace/files")
      );
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 403 for non-admin users", async () => {
      vi.mocked(getSession).mockResolvedValueOnce(mockViewerUser);

      const response = await getFiles(
        createRequest("http://localhost/api/workspace/files")
      );
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Forbidden");
    });

    it("should return workspace stats when stats param is true", async () => {
      vi.mocked(getSession).mockResolvedValueOnce(mockAdminUser);
      vi.mocked(getWorkspaceStats).mockResolvedValueOnce({
        totalFiles: 10,
        totalDirectories: 5,
        totalSize: 1024,
        memoryEntries: 3,
        rulesCount: 2,
        backupsCount: 1,
      });

      const response = await getFiles(
        createRequest("http://localhost/api/workspace/files?stats=true")
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.totalFiles).toBe(10);
      expect(getWorkspaceStats).toHaveBeenCalled();
    });

    it("should return file list for admin users", async () => {
      vi.mocked(getSession).mockResolvedValueOnce(mockAdminUser);
      vi.mocked(listWorkspaceFiles).mockResolvedValueOnce([mockWorkspaceFile]);

      const response = await getFiles(
        createRequest("http://localhost/api/workspace/files?path=workspace")
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toHaveLength(1);
      expect(data.data[0].name).toBe("test.md");
    });
  });

  describe("GET /api/workspace/files/[path]", () => {
    it("should return 401 when not authenticated", async () => {
      vi.mocked(getSession).mockResolvedValueOnce(null);

      const response = await getFile(
        createRequest("http://localhost/api/workspace/files/workspace/test.md"),
        { params: createPathParams("workspace/test.md") }
      );
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 403 for non-admin users", async () => {
      vi.mocked(getSession).mockResolvedValueOnce(mockViewerUser);

      const response = await getFile(
        createRequest("http://localhost/api/workspace/files/workspace/test.md"),
        { params: createPathParams("workspace/test.md") }
      );
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Forbidden");
    });

    it("should return file content for admin users", async () => {
      vi.mocked(getSession).mockResolvedValueOnce(mockAdminUser);
      vi.mocked(readWorkspaceFile).mockResolvedValueOnce(
        mockWorkspaceFileContent
      );

      const response = await getFile(
        createRequest("http://localhost/api/workspace/files/workspace/test.md"),
        { params: createPathParams("workspace/test.md") }
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.content).toBe("# Test Content");
    });

    it("should return 404 when file not found", async () => {
      vi.mocked(getSession).mockResolvedValueOnce(mockAdminUser);
      vi.mocked(readWorkspaceFile).mockRejectedValueOnce(
        new Error("File not found")
      );

      const response = await getFile(
        createRequest(
          "http://localhost/api/workspace/files/workspace/missing.md"
        ),
        { params: createPathParams("workspace/missing.md") }
      );
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("File not found");
    });
  });

  describe("PUT /api/workspace/files/[path]", () => {
    it("should return 401 when not authenticated", async () => {
      vi.mocked(getSession).mockResolvedValueOnce(null);

      const response = await putFile(
        createRequest(
          "http://localhost/api/workspace/files/workspace/test.md",
          {
            method: "PUT",
            body: { content: "New content" },
          }
        ),
        { params: createPathParams("workspace/test.md") }
      );
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 400 when content is not a string", async () => {
      vi.mocked(getSession).mockResolvedValueOnce(mockAdminUser);

      const response = await putFile(
        createRequest(
          "http://localhost/api/workspace/files/workspace/test.md",
          {
            method: "PUT",
            body: { content: 123 },
          }
        ),
        { params: createPathParams("workspace/test.md") }
      );
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Content must be a string");
    });

    it("should write file successfully", async () => {
      vi.mocked(getSession).mockResolvedValueOnce(mockAdminUser);
      vi.mocked(writeWorkspaceFile).mockResolvedValueOnce(
        mockWorkspaceFileContent
      );

      const response = await putFile(
        createRequest(
          "http://localhost/api/workspace/files/workspace/test.md",
          {
            method: "PUT",
            body: { content: "New content" },
          }
        ),
        { params: createPathParams("workspace/test.md") }
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.content).toBe("# Test Content");
      expect(writeWorkspaceFile).toHaveBeenCalledWith(
        "workspace/test.md",
        "New content"
      );
    });
  });

  describe("DELETE /api/workspace/files/[path]", () => {
    it("should return 401 when not authenticated", async () => {
      vi.mocked(getSession).mockResolvedValueOnce(null);

      const response = await deleteFile(
        createRequest(
          "http://localhost/api/workspace/files/workspace/test.md",
          {
            method: "DELETE",
          }
        ),
        { params: createPathParams("workspace/test.md") }
      );
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should delete file successfully", async () => {
      vi.mocked(getSession).mockResolvedValueOnce(mockAdminUser);
      vi.mocked(deleteWorkspaceFile).mockResolvedValueOnce(true);

      const response = await deleteFile(
        createRequest(
          "http://localhost/api/workspace/files/workspace/test.md",
          {
            method: "DELETE",
          }
        ),
        { params: createPathParams("workspace/test.md") }
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.success).toBe(true);
    });
  });
});

describe("Workspace Memory API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/workspace/memory", () => {
    it("should return 401 when not authenticated", async () => {
      vi.mocked(getSession).mockResolvedValueOnce(null);

      const response = await getMemory();
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 403 for non-admin users", async () => {
      vi.mocked(getSession).mockResolvedValueOnce(mockViewerUser);

      const response = await getMemory();
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Forbidden");
    });

    it("should return memory entries for admin users", async () => {
      vi.mocked(getSession).mockResolvedValueOnce(mockAdminUser);
      vi.mocked(listMemoryEntries).mockResolvedValueOnce([mockMemoryEntry]);

      const response = await getMemory();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toHaveLength(1);
      expect(data.data[0].name).toBe("test-memory");
    });
  });

  describe("POST /api/workspace/memory", () => {
    it("should return 401 when not authenticated", async () => {
      vi.mocked(getSession).mockResolvedValueOnce(null);

      const response = await postMemory(
        createRequest("http://localhost/api/workspace/memory", {
          method: "POST",
          body: {
            name: "new-memory",
            type: "project",
            content: "New content",
          },
        })
      );
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 400 when required fields are missing", async () => {
      vi.mocked(getSession).mockResolvedValueOnce(mockAdminUser);

      const response = await postMemory(
        createRequest("http://localhost/api/workspace/memory", {
          method: "POST",
          body: { name: "new-memory" },
        })
      );
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Name, type, and content are required");
    });

    it("should create memory entry successfully", async () => {
      vi.mocked(getSession).mockResolvedValueOnce(mockAdminUser);
      vi.mocked(createMemoryEntry).mockResolvedValueOnce(mockMemoryEntry);

      const response = await postMemory(
        createRequest("http://localhost/api/workspace/memory", {
          method: "POST",
          body: {
            name: "test-memory",
            type: "project",
            content: "This is test content",
          },
        })
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.name).toBe("test-memory");
    });
  });

  describe("GET /api/workspace/memory/[name]", () => {
    it("should return 401 when not authenticated", async () => {
      vi.mocked(getSession).mockResolvedValueOnce(null);

      const response = await getMemoryByName(
        createRequest("http://localhost/api/workspace/memory/test-memory"),
        { params: createNameParams("test-memory") }
      );
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 404 when memory entry not found", async () => {
      vi.mocked(getSession).mockResolvedValueOnce(mockAdminUser);
      vi.mocked(getMemoryEntry).mockResolvedValueOnce(null);

      const response = await getMemoryByName(
        createRequest("http://localhost/api/workspace/memory/missing"),
        { params: createNameParams("missing") }
      );
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Memory entry not found");
    });

    it("should return memory entry for admin users", async () => {
      vi.mocked(getSession).mockResolvedValueOnce(mockAdminUser);
      vi.mocked(getMemoryEntry).mockResolvedValueOnce(mockMemoryEntry);

      const response = await getMemoryByName(
        createRequest("http://localhost/api/workspace/memory/test-memory"),
        { params: createNameParams("test-memory") }
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.name).toBe("test-memory");
    });
  });

  describe("PUT /api/workspace/memory/[name]", () => {
    it("should return 401 when not authenticated", async () => {
      vi.mocked(getSession).mockResolvedValueOnce(null);

      const response = await putMemoryByName(
        createRequest("http://localhost/api/workspace/memory/test-memory", {
          method: "PUT",
          body: { content: "Updated content" },
        }),
        { params: createNameParams("test-memory") }
      );
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should update memory entry successfully", async () => {
      vi.mocked(getSession).mockResolvedValueOnce(mockAdminUser);
      vi.mocked(updateMemoryEntry).mockResolvedValueOnce(mockMemoryEntry);

      const response = await putMemoryByName(
        createRequest("http://localhost/api/workspace/memory/test-memory", {
          method: "PUT",
          body: { content: "Updated content" },
        }),
        { params: createNameParams("test-memory") }
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.name).toBe("test-memory");
    });
  });

  describe("DELETE /api/workspace/memory/[name]", () => {
    it("should return 401 when not authenticated", async () => {
      vi.mocked(getSession).mockResolvedValueOnce(null);

      const response = await deleteMemoryByName(
        createRequest("http://localhost/api/workspace/memory/test-memory", {
          method: "DELETE",
        }),
        { params: createNameParams("test-memory") }
      );
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should delete memory entry successfully", async () => {
      vi.mocked(getSession).mockResolvedValueOnce(mockAdminUser);
      vi.mocked(deleteMemoryEntry).mockResolvedValueOnce(true);

      const response = await deleteMemoryByName(
        createRequest("http://localhost/api/workspace/memory/test-memory", {
          method: "DELETE",
        }),
        { params: createNameParams("test-memory") }
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.success).toBe(true);
    });
  });
});

describe("Workspace Backups API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/workspace/backups", () => {
    it("should return 401 when not authenticated", async () => {
      vi.mocked(getSession).mockResolvedValueOnce(null);

      const response = await getBackups();
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 403 for non-admin users", async () => {
      vi.mocked(getSession).mockResolvedValueOnce(mockViewerUser);

      const response = await getBackups();
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Forbidden");
    });

    it("should return backups for admin users", async () => {
      vi.mocked(getSession).mockResolvedValueOnce(mockAdminUser);
      vi.mocked(listWorkspaceBackups).mockResolvedValueOnce([mockBackup]);

      const response = await getBackups();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toHaveLength(1);
      expect(data.data[0].name).toBe("Test Backup");
    });
  });

  describe("POST /api/workspace/backups", () => {
    it("should return 401 when not authenticated", async () => {
      vi.mocked(getSession).mockResolvedValueOnce(null);

      const response = await postBackup(
        createRequest("http://localhost/api/workspace/backups", {
          method: "POST",
          body: { name: "New Backup" },
        })
      );
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should create backup successfully", async () => {
      vi.mocked(getSession).mockResolvedValueOnce(mockAdminUser);
      vi.mocked(createWorkspaceBackup).mockResolvedValueOnce(mockBackup);

      const response = await postBackup(
        createRequest("http://localhost/api/workspace/backups", {
          method: "POST",
          body: { name: "Test Backup", description: "A test backup" },
        })
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.name).toBe("Test Backup");
    });
  });

  describe("GET /api/workspace/backups/[id]", () => {
    it("should return 401 when not authenticated", async () => {
      vi.mocked(getSession).mockResolvedValueOnce(null);

      const response = await getBackup(
        createRequest("http://localhost/api/workspace/backups/backup-123"),
        { params: createIdParams("backup-123") }
      );
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 404 when backup not found", async () => {
      vi.mocked(getSession).mockResolvedValueOnce(mockAdminUser);
      vi.mocked(getWorkspaceBackup).mockResolvedValueOnce(null);

      const response = await getBackup(
        createRequest("http://localhost/api/workspace/backups/missing"),
        { params: createIdParams("missing") }
      );
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Backup not found");
    });

    it("should return backup for admin users", async () => {
      vi.mocked(getSession).mockResolvedValueOnce(mockAdminUser);
      vi.mocked(getWorkspaceBackup).mockResolvedValueOnce(mockBackup);

      const response = await getBackup(
        createRequest("http://localhost/api/workspace/backups/backup-123"),
        { params: createIdParams("backup-123") }
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.name).toBe("Test Backup");
    });
  });

  describe("DELETE /api/workspace/backups/[id]", () => {
    it("should return 401 when not authenticated", async () => {
      vi.mocked(getSession).mockResolvedValueOnce(null);

      const response = await deleteBackup(
        createRequest("http://localhost/api/workspace/backups/backup-123", {
          method: "DELETE",
        }),
        { params: createIdParams("backup-123") }
      );
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should delete backup successfully", async () => {
      vi.mocked(getSession).mockResolvedValueOnce(mockAdminUser);
      vi.mocked(deleteWorkspaceBackup).mockResolvedValueOnce(true);

      const response = await deleteBackup(
        createRequest("http://localhost/api/workspace/backups/backup-123", {
          method: "DELETE",
        }),
        { params: createIdParams("backup-123") }
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.success).toBe(true);
    });
  });

  describe("POST /api/workspace/backups/[id]/restore", () => {
    it("should return 401 when not authenticated", async () => {
      vi.mocked(getSession).mockResolvedValueOnce(null);

      const response = await restoreBackup(
        createRequest(
          "http://localhost/api/workspace/backups/backup-123/restore",
          {
            method: "POST",
          }
        ),
        { params: createIdParams("backup-123") }
      );
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should restore backup successfully", async () => {
      vi.mocked(getSession).mockResolvedValueOnce(mockAdminUser);
      vi.mocked(restoreWorkspaceBackup).mockResolvedValueOnce(true);

      const response = await restoreBackup(
        createRequest(
          "http://localhost/api/workspace/backups/backup-123/restore",
          {
            method: "POST",
          }
        ),
        { params: createIdParams("backup-123") }
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.success).toBe(true);
    });

    it("should return 404 when backup not found", async () => {
      vi.mocked(getSession).mockResolvedValueOnce(mockAdminUser);
      vi.mocked(restoreWorkspaceBackup).mockRejectedValueOnce(
        new Error("Backup not found")
      );

      const response = await restoreBackup(
        createRequest(
          "http://localhost/api/workspace/backups/missing/restore",
          {
            method: "POST",
          }
        ),
        { params: createIdParams("missing") }
      );
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Backup not found");
    });
  });
});
