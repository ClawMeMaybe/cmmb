import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST } from "@/app/api/tags/route";
import { GET as getById, PUT, DELETE } from "@/app/api/tags/[id]/route";
import { POST as bulkTagsPost } from "@/app/api/instances/bulk-tags/route";
import {
  GET as getInstanceTags,
  POST as addInstanceTag,
} from "@/app/api/instances/[id]/tags/route";
import { DELETE as removeInstanceTag } from "@/app/api/instances/[id]/tags/[tagId]/route";

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
    tag: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    instanceTag: {
      findMany: vi.fn(),
      create: vi.fn(),
      createMany: vi.fn(),
      delete: vi.fn(),
    },
    instance: {
      findMany: vi.fn(),
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

function createInstanceTagParams(instanceId: string, tagId: string) {
  return Promise.resolve({ id: instanceId, tagId });
}

const mockAdminUser = {
  id: "user-123",
  email: "admin@clawmemaybe.com",
  name: "Admin",
  role: "ADMIN" as const,
};

const mockViewerUser = {
  id: "user-456",
  email: "viewer@clawmemaybe.com",
  name: "Viewer",
  role: "VIEWER" as const,
};

const mockTag = {
  id: "tag-123",
  name: "Production",
  color: "#6B7280",
  createdAt: new Date("2024-01-01T00:00:00Z"),
  updatedAt: new Date("2024-01-01T00:00:00Z"),
};

const mockTagWithCount = {
  ...mockTag,
  _count: { instances: 5 },
};

const mockInstanceTag = {
  instanceId: "instance-123",
  tagId: "tag-123",
  assignedAt: new Date("2024-01-01T00:00:00Z"),
  assignedBy: "user-123",
  tag: mockTag,
};

describe("Tags API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/tags", () => {
    it("should return 401 when not authenticated", async () => {
      vi.mocked(getSession).mockResolvedValueOnce(null);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return list of tags when authenticated", async () => {
      vi.mocked(getSession).mockResolvedValueOnce(mockAdminUser);
      vi.mocked(prisma.tag.findMany).mockResolvedValueOnce([mockTag]);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toHaveLength(1);
      expect(data.data[0].name).toBe("Production");
    });
  });

  describe("POST /api/tags", () => {
    it("should return 401 when not authenticated", async () => {
      vi.mocked(getSession).mockResolvedValueOnce(null);

      const request = createRequest("http://localhost/api/tags", {
        method: "POST",
        body: { name: "New Tag" },
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 403 for non-admin users", async () => {
      vi.mocked(getSession).mockResolvedValueOnce(mockViewerUser);

      const request = createRequest("http://localhost/api/tags", {
        method: "POST",
        body: { name: "New Tag" },
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Only admins can create tags");
    });

    it("should return 400 when name is missing", async () => {
      vi.mocked(getSession).mockResolvedValueOnce(mockAdminUser);

      const request = createRequest("http://localhost/api/tags", {
        method: "POST",
        body: { color: "#FF0000" },
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Tag name is required");
    });

    it("should create tag successfully", async () => {
      vi.mocked(getSession).mockResolvedValueOnce(mockAdminUser);
      vi.mocked(prisma.tag.create).mockResolvedValueOnce(mockTag);

      const request = createRequest("http://localhost/api/tags", {
        method: "POST",
        body: { name: "Production" },
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.message).toBe("Tag created successfully");
      expect(data.data.name).toBe("Production");
    });

    it("should create tag with custom color", async () => {
      vi.mocked(getSession).mockResolvedValueOnce(mockAdminUser);
      vi.mocked(prisma.tag.create).mockResolvedValueOnce({
        ...mockTag,
        color: "#FF0000",
      });

      const request = createRequest("http://localhost/api/tags", {
        method: "POST",
        body: { name: "Production", color: "#FF0000" },
      });
      const response = await POST(request);

      expect(response.status).toBe(201);
      expect(prisma.tag.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            color: "#FF0000",
          }),
        })
      );
    });
  });

  describe("GET /api/tags/[id]", () => {
    it("should return 401 when not authenticated", async () => {
      vi.mocked(getSession).mockResolvedValueOnce(null);

      const response = await getById(
        createRequest("http://localhost/api/tags/tag-123"),
        { params: createParams("tag-123") }
      );
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 404 when tag not found", async () => {
      vi.mocked(getSession).mockResolvedValueOnce(mockAdminUser);
      vi.mocked(prisma.tag.findUnique).mockResolvedValueOnce(null);

      const response = await getById(
        createRequest("http://localhost/api/tags/nonexistent"),
        { params: createParams("nonexistent") }
      );
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Tag not found");
    });

    it("should return tag with instance count", async () => {
      vi.mocked(getSession).mockResolvedValueOnce(mockAdminUser);
      vi.mocked(prisma.tag.findUnique).mockResolvedValueOnce(mockTagWithCount);

      const response = await getById(
        createRequest("http://localhost/api/tags/tag-123"),
        { params: createParams("tag-123") }
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.name).toBe("Production");
      expect(data.data.instanceCount).toBe(5);
    });
  });

  describe("PUT /api/tags/[id]", () => {
    it("should return 401 when not authenticated", async () => {
      vi.mocked(getSession).mockResolvedValueOnce(null);

      const request = createRequest("http://localhost/api/tags/tag-123", {
        method: "PUT",
        body: { name: "Updated Name" },
      });
      const response = await PUT(request, { params: createParams("tag-123") });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 403 for non-admin users", async () => {
      vi.mocked(getSession).mockResolvedValueOnce(mockViewerUser);

      const request = createRequest("http://localhost/api/tags/tag-123", {
        method: "PUT",
        body: { name: "Updated Name" },
      });
      const response = await PUT(request, { params: createParams("tag-123") });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Only admins can update tags");
    });

    it("should return 400 when no fields provided", async () => {
      vi.mocked(getSession).mockResolvedValueOnce(mockAdminUser);

      const request = createRequest("http://localhost/api/tags/tag-123", {
        method: "PUT",
        body: {},
      });
      const response = await PUT(request, { params: createParams("tag-123") });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("At least one field (name or color) is required");
    });

    it("should update tag successfully", async () => {
      vi.mocked(getSession).mockResolvedValueOnce(mockAdminUser);
      vi.mocked(prisma.tag.update).mockResolvedValueOnce({
        ...mockTag,
        name: "Updated Name",
      });

      const request = createRequest("http://localhost/api/tags/tag-123", {
        method: "PUT",
        body: { name: "Updated Name" },
      });
      const response = await PUT(request, { params: createParams("tag-123") });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe("Tag updated successfully");
      expect(data.data.name).toBe("Updated Name");
    });
  });

  describe("DELETE /api/tags/[id]", () => {
    it("should return 401 when not authenticated", async () => {
      vi.mocked(getSession).mockResolvedValueOnce(null);

      const request = createRequest("http://localhost/api/tags/tag-123", {
        method: "DELETE",
      });
      const response = await DELETE(request, {
        params: createParams("tag-123"),
      });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 403 for non-admin users", async () => {
      vi.mocked(getSession).mockResolvedValueOnce(mockViewerUser);

      const request = createRequest("http://localhost/api/tags/tag-123", {
        method: "DELETE",
      });
      const response = await DELETE(request, {
        params: createParams("tag-123"),
      });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Only admins can delete tags");
    });

    it("should delete tag successfully", async () => {
      vi.mocked(getSession).mockResolvedValueOnce(mockAdminUser);
      vi.mocked(prisma.tag.delete).mockResolvedValueOnce(mockTag);

      const request = createRequest("http://localhost/api/tags/tag-123", {
        method: "DELETE",
      });
      const response = await DELETE(request, {
        params: createParams("tag-123"),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe("Tag deleted successfully");
      expect(prisma.tag.delete).toHaveBeenCalledWith({
        where: { id: "tag-123" },
      });
    });
  });

  describe("GET /api/instances/[id]/tags", () => {
    it("should return 401 when not authenticated", async () => {
      vi.mocked(getSession).mockResolvedValueOnce(null);

      const response = await getInstanceTags(
        createRequest("http://localhost/api/instances/instance-123/tags"),
        { params: createParams("instance-123") }
      );
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return instance tags", async () => {
      vi.mocked(getSession).mockResolvedValueOnce(mockAdminUser);
      vi.mocked(prisma.instanceTag.findMany).mockResolvedValueOnce([
        mockInstanceTag,
      ]);

      const response = await getInstanceTags(
        createRequest("http://localhost/api/instances/instance-123/tags"),
        { params: createParams("instance-123") }
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toHaveLength(1);
      expect(data.data[0].tag.name).toBe("Production");
    });
  });

  describe("POST /api/instances/[id]/tags", () => {
    it("should return 401 when not authenticated", async () => {
      vi.mocked(getSession).mockResolvedValueOnce(null);

      const request = createRequest(
        "http://localhost/api/instances/instance-123/tags",
        {
          method: "POST",
          body: { tagId: "tag-123" },
        }
      );
      const response = await addInstanceTag(request, {
        params: createParams("instance-123"),
      });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 400 when tagId is missing", async () => {
      vi.mocked(getSession).mockResolvedValueOnce(mockAdminUser);

      const request = createRequest(
        "http://localhost/api/instances/instance-123/tags",
        {
          method: "POST",
          body: {},
        }
      );
      const response = await addInstanceTag(request, {
        params: createParams("instance-123"),
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Tag ID is required");
    });

    it("should add tag to instance", async () => {
      vi.mocked(getSession).mockResolvedValueOnce(mockAdminUser);
      vi.mocked(prisma.instanceTag.create).mockResolvedValueOnce(
        mockInstanceTag
      );

      const request = createRequest(
        "http://localhost/api/instances/instance-123/tags",
        {
          method: "POST",
          body: { tagId: "tag-123" },
        }
      );
      const response = await addInstanceTag(request, {
        params: createParams("instance-123"),
      });
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.message).toBe("Tag added to instance successfully");
      expect(prisma.instanceTag.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            instanceId: "instance-123",
            tagId: "tag-123",
            assignedBy: "user-123",
          }),
        })
      );
    });
  });

  describe("DELETE /api/instances/[id]/tags/[tagId]", () => {
    it("should return 401 when not authenticated", async () => {
      vi.mocked(getSession).mockResolvedValueOnce(null);

      const request = createRequest(
        "http://localhost/api/instances/instance-123/tags/tag-123",
        {
          method: "DELETE",
        }
      );
      const response = await removeInstanceTag(request, {
        params: createInstanceTagParams("instance-123", "tag-123"),
      });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should remove tag from instance", async () => {
      vi.mocked(getSession).mockResolvedValueOnce(mockAdminUser);
      vi.mocked(prisma.instanceTag.delete).mockResolvedValueOnce(
        mockInstanceTag
      );

      const request = createRequest(
        "http://localhost/api/instances/instance-123/tags/tag-123",
        {
          method: "DELETE",
        }
      );
      const response = await removeInstanceTag(request, {
        params: createInstanceTagParams("instance-123", "tag-123"),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe("Tag removed from instance successfully");
      expect(prisma.instanceTag.delete).toHaveBeenCalledWith({
        where: {
          instanceId_tagId: {
            instanceId: "instance-123",
            tagId: "tag-123",
          },
        },
      });
    });
  });

  describe("POST /api/instances/bulk-tags", () => {
    it("should return 401 when not authenticated", async () => {
      vi.mocked(getSession).mockResolvedValueOnce(null);

      const request = createRequest(
        "http://localhost/api/instances/bulk-tags",
        {
          method: "POST",
          body: {
            instanceIds: ["instance-123"],
            tagIds: ["tag-123"],
            action: "add",
          },
        }
      );
      const response = await bulkTagsPost(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 403 for non-admin users", async () => {
      vi.mocked(getSession).mockResolvedValueOnce(mockViewerUser);

      const request = createRequest(
        "http://localhost/api/instances/bulk-tags",
        {
          method: "POST",
          body: {
            instanceIds: ["instance-123"],
            tagIds: ["tag-123"],
            action: "add",
          },
        }
      );
      const response = await bulkTagsPost(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Only admins can perform bulk tag operations");
    });

    it("should return 400 when instanceIds is missing", async () => {
      vi.mocked(getSession).mockResolvedValueOnce(mockAdminUser);

      const request = createRequest(
        "http://localhost/api/instances/bulk-tags",
        {
          method: "POST",
          body: {
            tagIds: ["tag-123"],
            action: "add",
          },
        }
      );
      const response = await bulkTagsPost(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe(
        "Instance IDs array is required and must not be empty"
      );
    });

    it("should return 400 when tagIds is missing", async () => {
      vi.mocked(getSession).mockResolvedValueOnce(mockAdminUser);

      const request = createRequest(
        "http://localhost/api/instances/bulk-tags",
        {
          method: "POST",
          body: {
            instanceIds: ["instance-123"],
            action: "add",
          },
        }
      );
      const response = await bulkTagsPost(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe(
        "Tag IDs array is required and must not be empty"
      );
    });

    it("should return 400 when action is invalid", async () => {
      vi.mocked(getSession).mockResolvedValueOnce(mockAdminUser);

      const request = createRequest(
        "http://localhost/api/instances/bulk-tags",
        {
          method: "POST",
          body: {
            instanceIds: ["instance-123"],
            tagIds: ["tag-123"],
            action: "invalid",
          },
        }
      );
      const response = await bulkTagsPost(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Action must be either 'add' or 'remove'");
    });

    it("should perform bulk add operation", async () => {
      vi.mocked(getSession).mockResolvedValueOnce(mockAdminUser);
      vi.mocked(prisma.instanceTag.createMany).mockResolvedValueOnce({
        count: 2,
      });

      const request = createRequest(
        "http://localhost/api/instances/bulk-tags",
        {
          method: "POST",
          body: {
            instanceIds: ["instance-123", "instance-456"],
            tagIds: ["tag-123"],
            action: "add",
          },
        }
      );
      const response = await bulkTagsPost(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe(
        "Bulk tag add operation completed successfully"
      );
      expect(data.data.count).toBe(2);
      expect(prisma.instanceTag.createMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.arrayContaining([
            expect.objectContaining({
              instanceId: "instance-123",
              tagId: "tag-123",
              assignedBy: "user-123",
            }),
            expect.objectContaining({
              instanceId: "instance-456",
              tagId: "tag-123",
              assignedBy: "user-123",
            }),
          ]),
          skipDuplicates: true,
        })
      );
    });
  });
});
