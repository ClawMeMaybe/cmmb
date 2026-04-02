import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST } from "@/app/api/teams/route";
import { GET as getById, PUT, DELETE } from "@/app/api/teams/[id]/route";
import { GET as getDashboard } from "@/app/api/teams/[id]/dashboard/route";
import { POST as addMember } from "@/app/api/teams/[id]/members/route";
import {
  DELETE as removeMember,
  PUT as updateMemberRole,
} from "@/app/api/teams/[id]/members/[userId]/route";
import {
  GET as getInstances,
  POST as assignInstance,
} from "@/app/api/teams/[id]/instances/route";
import { DELETE as unassignInstance } from "@/app/api/teams/[id]/instances/[instanceId]/route";
import { TeamRole, InstanceStatus, TeamMember } from "@prisma/client";

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
    team: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    teamMember: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    instance: {
      findMany: vi.fn(),
    },
    channel: {
      findMany: vi.fn(),
    },
    alert: {
      findMany: vi.fn(),
    },
    instanceAssignment: {
      create: vi.fn(),
      delete: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
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

function createMemberParams(teamId: string, userId: string) {
  return Promise.resolve({ id: teamId, userId });
}

function createInstanceParams(teamId: string, instanceId: string) {
  return Promise.resolve({ id: teamId, instanceId });
}

const mockUser = {
  id: "user-123",
  email: "admin@clawmemaybe.com",
  name: "Admin",
  role: "ADMIN" as const,
  sessionId: "session-admin-123",
};

const mockTeam = {
  id: "team-123",
  name: "Test Team",
  description: "A test team",
  ownerId: "user-123",
  createdAt: new Date("2024-01-01T00:00:00Z"),
  updatedAt: new Date("2024-01-01T00:00:00Z"),
  members: [
    {
      id: "member-123",
      teamId: "team-123",
      userId: "user-123",
      role: TeamRole.OWNER,
      joinedAt: new Date("2024-01-01T00:00:00Z"),
      user: { id: "user-123", email: "admin@clawmemaybe.com", name: "Admin" },
    },
  ],
};

const mockMember: TeamMember & {
  user: { id: string; email: string; name: string | null };
} = {
  id: "member-456",
  teamId: "team-123",
  userId: "user-456",
  role: TeamRole.MEMBER,
  joinedAt: new Date("2024-01-01T00:00:00Z"),
  user: { id: "user-456", email: "member@example.com", name: "Member" },
};

describe("Teams API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/teams", () => {
    it("should return 401 when not authenticated", async () => {
      vi.mocked(getSession).mockResolvedValueOnce(null);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return list of teams when authenticated", async () => {
      vi.mocked(getSession).mockResolvedValueOnce(mockUser);
      vi.mocked(prisma.team.findMany).mockResolvedValueOnce([mockTeam]);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toHaveLength(1);
      expect(data.data[0].name).toBe("Test Team");
    });
  });

  describe("POST /api/teams", () => {
    it("should return 401 when not authenticated", async () => {
      vi.mocked(getSession).mockResolvedValueOnce(null);

      const request = createRequest("http://localhost/api/teams", {
        method: "POST",
        body: { name: "New Team" },
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 400 when name is missing", async () => {
      vi.mocked(getSession).mockResolvedValueOnce(mockUser);

      const request = createRequest("http://localhost/api/teams", {
        method: "POST",
        body: {},
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Team name is required");
    });

    it("should create team successfully", async () => {
      vi.mocked(getSession).mockResolvedValueOnce(mockUser);
      vi.mocked(prisma.team.create).mockResolvedValueOnce(mockTeam);
      vi.mocked(prisma.auditLog.create).mockResolvedValueOnce({} as never);

      const request = createRequest("http://localhost/api/teams", {
        method: "POST",
        body: {
          name: "Test Team",
          description: "A test team",
        },
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.message).toBe("Team created successfully");
      expect(data.data.name).toBe("Test Team");
    });
  });

  describe("GET /api/teams/[id]", () => {
    it("should return 401 when not authenticated", async () => {
      vi.mocked(getSession).mockResolvedValueOnce(null);

      const response = await getById(
        createRequest("http://localhost/api/teams/team-123"),
        { params: createParams("team-123") }
      );
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 404 when team not found", async () => {
      vi.mocked(getSession).mockResolvedValueOnce(mockUser);
      vi.mocked(prisma.team.findUnique).mockResolvedValueOnce(null);

      const response = await getById(
        createRequest("http://localhost/api/teams/nonexistent"),
        { params: createParams("nonexistent") }
      );
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Team not found");
    });

    it("should return team when found", async () => {
      vi.mocked(getSession).mockResolvedValueOnce(mockUser);
      vi.mocked(prisma.team.findUnique).mockResolvedValueOnce(mockTeam);

      const response = await getById(
        createRequest("http://localhost/api/teams/team-123"),
        { params: createParams("team-123") }
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.name).toBe("Test Team");
    });
  });

  describe("PUT /api/teams/[id]", () => {
    it("should return 401 when not authenticated", async () => {
      vi.mocked(getSession).mockResolvedValueOnce(null);

      const request = createRequest("http://localhost/api/teams/team-123", {
        method: "PUT",
        body: { name: "Updated Name" },
      });
      const response = await PUT(request, { params: createParams("team-123") });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 403 when user is not admin", async () => {
      vi.mocked(getSession).mockResolvedValueOnce(mockUser);
      vi.mocked(prisma.teamMember.findUnique).mockResolvedValueOnce(null);

      const request = createRequest("http://localhost/api/teams/team-123", {
        method: "PUT",
        body: { name: "Updated Name" },
      });
      const response = await PUT(request, { params: createParams("team-123") });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Forbidden - insufficient permissions");
    });

    it("should update team successfully when user has ADMIN role", async () => {
      vi.mocked(getSession).mockResolvedValueOnce(mockUser);
      // Mock checkTeamPermission to return ADMIN role
      vi.mocked(prisma.teamMember.findUnique).mockResolvedValueOnce({
        role: TeamRole.ADMIN,
      } as TeamMember);
      const updatedTeam = { ...mockTeam, name: "Updated Name" };
      vi.mocked(prisma.team.update).mockResolvedValueOnce(updatedTeam);
      vi.mocked(prisma.auditLog.create).mockResolvedValueOnce({} as never);

      const request = createRequest("http://localhost/api/teams/team-123", {
        method: "PUT",
        body: { name: "Updated Name" },
      });
      const response = await PUT(request, { params: createParams("team-123") });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe("Team updated successfully");
      expect(data.data.name).toBe("Updated Name");
    });
  });

  describe("DELETE /api/teams/[id]", () => {
    it("should return 401 when not authenticated", async () => {
      vi.mocked(getSession).mockResolvedValueOnce(null);

      const request = createRequest("http://localhost/api/teams/team-123", {
        method: "DELETE",
      });
      const response = await DELETE(request, {
        params: createParams("team-123"),
      });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 403 when user is not OWNER", async () => {
      vi.mocked(getSession).mockResolvedValueOnce(mockUser);
      vi.mocked(prisma.teamMember.findUnique).mockResolvedValueOnce(
        mockMember as unknown as TeamMember
      );

      const request = createRequest("http://localhost/api/teams/team-123", {
        method: "DELETE",
      });
      const response = await DELETE(request, {
        params: createParams("team-123"),
      });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe(
        "Forbidden - only team owner can delete the team"
      );
    });

    it("should delete team successfully when user is OWNER", async () => {
      vi.mocked(getSession).mockResolvedValueOnce(mockUser);
      vi.mocked(prisma.teamMember.findUnique).mockResolvedValueOnce({
        role: TeamRole.OWNER,
      } as TeamMember);
      vi.mocked(prisma.team.delete).mockResolvedValueOnce(mockTeam);
      vi.mocked(prisma.auditLog.create).mockResolvedValueOnce({} as never);

      const request = createRequest("http://localhost/api/teams/team-123", {
        method: "DELETE",
      });
      const response = await DELETE(request, {
        params: createParams("team-123"),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe("Team deleted successfully");
    });
  });

  describe("GET /api/teams/[id]/dashboard", () => {
    it("should return 401 when not authenticated", async () => {
      vi.mocked(getSession).mockResolvedValueOnce(null);

      const response = await getDashboard(
        createRequest("http://localhost/api/teams/team-123/dashboard"),
        { params: createParams("team-123") }
      );
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 403 when user is not team member", async () => {
      vi.mocked(getSession).mockResolvedValueOnce(mockUser);
      vi.mocked(prisma.teamMember.findUnique).mockResolvedValueOnce(null);

      const response = await getDashboard(
        createRequest("http://localhost/api/teams/team-123/dashboard"),
        { params: createParams("team-123") }
      );
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Forbidden - not a team member");
    });

    it("should return dashboard stats when user is team member", async () => {
      vi.mocked(getSession).mockResolvedValueOnce(mockUser);
      vi.mocked(prisma.teamMember.findUnique).mockResolvedValueOnce({
        role: TeamRole.MEMBER,
      } as TeamMember);
      vi.mocked(prisma.team.findUnique).mockResolvedValueOnce({
        ...mockTeam,
        instances: [{ instanceId: "instance-123" }],
      } as unknown as typeof mockTeam);
      vi.mocked(prisma.instance.findMany).mockResolvedValueOnce([
        {
          id: "instance-1",
          name: "Instance 1",
          status: InstanceStatus.ONLINE,
          description: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          gatewayUrl: "https://gw.com",
          token: "token",
          createdById: "user-1",
        },
        {
          id: "instance-2",
          name: "Instance 2",
          status: InstanceStatus.OFFLINE,
          description: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          gatewayUrl: "https://gw.com",
          token: "token",
          createdById: "user-1",
        },
      ]);
      vi.mocked(prisma.channel.findMany).mockResolvedValueOnce([
        { id: "ch-1" },
      ] as unknown as never[]);
      vi.mocked(prisma.alert.findMany).mockResolvedValueOnce([]);
      vi.mocked(prisma.auditLog.findMany).mockResolvedValueOnce([]);

      const response = await getDashboard(
        createRequest("http://localhost/api/teams/team-123/dashboard"),
        { params: createParams("team-123") }
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.teamName).toBe("Test Team");
    });
  });

  describe("POST /api/teams/[id]/members", () => {
    it("should return 401 when not authenticated", async () => {
      vi.mocked(getSession).mockResolvedValueOnce(null);

      const request = createRequest(
        "http://localhost/api/teams/team-123/members",
        {
          method: "POST",
          body: { userId: "user-456" },
        }
      );
      const response = await addMember(request, {
        params: createParams("team-123"),
      });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 403 when user is not ADMIN", async () => {
      vi.mocked(getSession).mockResolvedValueOnce(mockUser);
      vi.mocked(prisma.teamMember.findUnique).mockResolvedValueOnce(
        mockMember as unknown as TeamMember
      );

      const request = createRequest(
        "http://localhost/api/teams/team-123/members",
        {
          method: "POST",
          body: { userId: "user-456" },
        }
      );
      const response = await addMember(request, {
        params: createParams("team-123"),
      });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Forbidden - insufficient permissions");
    });

    it("should add member successfully", async () => {
      vi.mocked(getSession).mockResolvedValueOnce(mockUser);
      vi.mocked(prisma.teamMember.findUnique).mockResolvedValueOnce({
        role: TeamRole.ADMIN,
      } as TeamMember);
      vi.mocked(prisma.teamMember.create).mockResolvedValueOnce(mockMember);
      vi.mocked(prisma.auditLog.create).mockResolvedValueOnce({} as never);

      const request = createRequest(
        "http://localhost/api/teams/team-123/members",
        {
          method: "POST",
          body: { userId: "user-456", role: TeamRole.MEMBER },
        }
      );
      const response = await addMember(request, {
        params: createParams("team-123"),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe("Member added successfully");
    });

    it("should reject OWNER role assignment", async () => {
      vi.mocked(getSession).mockResolvedValueOnce(mockUser);
      vi.mocked(prisma.teamMember.findUnique).mockResolvedValueOnce({
        role: TeamRole.ADMIN,
      } as TeamMember);

      const request = createRequest(
        "http://localhost/api/teams/team-123/members",
        {
          method: "POST",
          body: { userId: "user-456", role: TeamRole.OWNER },
        }
      );
      const response = await addMember(request, {
        params: createParams("team-123"),
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Cannot assign OWNER role through this endpoint");
    });
  });

  describe("DELETE /api/teams/[id]/members/[userId]", () => {
    it("should return 401 when not authenticated", async () => {
      vi.mocked(getSession).mockResolvedValueOnce(null);

      const request = createRequest(
        "http://localhost/api/teams/team-123/members/user-456",
        {
          method: "DELETE",
        }
      );
      const response = await removeMember(request, {
        params: createMemberParams("team-123", "user-456"),
      });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 403 when user is not ADMIN", async () => {
      vi.mocked(getSession).mockResolvedValueOnce(mockUser);
      vi.mocked(prisma.teamMember.findUnique).mockResolvedValueOnce({
        role: TeamRole.MEMBER,
      } as TeamMember);

      const request = createRequest(
        "http://localhost/api/teams/team-123/members/user-456",
        {
          method: "DELETE",
        }
      );
      const response = await removeMember(request, {
        params: createMemberParams("team-123", "user-456"),
      });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Forbidden - insufficient permissions");
    });

    it("should reject removing team owner", async () => {
      vi.mocked(getSession).mockResolvedValueOnce(mockUser);
      vi.mocked(prisma.teamMember.findUnique)
        .mockResolvedValueOnce({ role: TeamRole.ADMIN } as TeamMember) // actor with ADMIN role
        .mockResolvedValueOnce({ role: TeamRole.OWNER } as TeamMember); // target with OWNER role

      const request = createRequest(
        "http://localhost/api/teams/team-123/members/user-123",
        {
          method: "DELETE",
        }
      );
      const response = await removeMember(request, {
        params: createMemberParams("team-123", "user-123"),
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Cannot remove the team owner");
    });

    it("should remove member successfully", async () => {
      vi.mocked(getSession).mockResolvedValueOnce(mockUser);
      vi.mocked(prisma.teamMember.findUnique)
        .mockResolvedValueOnce({ role: TeamRole.ADMIN } as TeamMember) // actor with ADMIN role
        .mockResolvedValueOnce({ role: TeamRole.MEMBER } as TeamMember); // target with MEMBER role
      vi.mocked(prisma.teamMember.delete).mockResolvedValueOnce(mockMember);
      vi.mocked(prisma.auditLog.create).mockResolvedValueOnce({} as never);

      const request = createRequest(
        "http://localhost/api/teams/team-123/members/user-456",
        {
          method: "DELETE",
        }
      );
      const response = await removeMember(request, {
        params: createMemberParams("team-123", "user-456"),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe("Member removed successfully");
    });
  });

  describe("PUT /api/teams/[id]/members/[userId]", () => {
    it("should update member role successfully", async () => {
      vi.mocked(getSession).mockResolvedValueOnce(mockUser);
      vi.mocked(prisma.teamMember.findUnique).mockResolvedValueOnce({
        role: TeamRole.ADMIN,
      } as TeamMember);
      vi.mocked(prisma.teamMember.update).mockResolvedValueOnce({
        ...mockMember,
        role: TeamRole.ADMIN,
      });
      vi.mocked(prisma.auditLog.create).mockResolvedValueOnce({} as never);

      const request = createRequest(
        "http://localhost/api/teams/team-123/members/user-456",
        {
          method: "PUT",
          body: { role: TeamRole.ADMIN },
        }
      );
      const response = await updateMemberRole(request, {
        params: createMemberParams("team-123", "user-456"),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe("Member role updated successfully");
    });

    it("should reject OWNER role assignment", async () => {
      vi.mocked(getSession).mockResolvedValueOnce(mockUser);
      vi.mocked(prisma.teamMember.findUnique).mockResolvedValueOnce({
        role: TeamRole.ADMIN,
      } as TeamMember);

      const request = createRequest(
        "http://localhost/api/teams/team-123/members/user-456",
        {
          method: "PUT",
          body: { role: TeamRole.OWNER },
        }
      );
      const response = await updateMemberRole(request, {
        params: createMemberParams("team-123", "user-456"),
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Cannot assign OWNER role through this endpoint");
    });
  });

  describe("GET /api/teams/[id]/instances", () => {
    it("should return 401 when not authenticated", async () => {
      vi.mocked(getSession).mockResolvedValueOnce(null);

      const response = await getInstances(
        createRequest("http://localhost/api/teams/team-123/instances"),
        { params: createParams("team-123") }
      );
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 403 when user is not team member", async () => {
      vi.mocked(getSession).mockResolvedValueOnce(mockUser);
      vi.mocked(prisma.teamMember.findUnique).mockResolvedValueOnce(null);

      const response = await getInstances(
        createRequest("http://localhost/api/teams/team-123/instances"),
        { params: createParams("team-123") }
      );
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Forbidden - not a team member");
    });

    it("should return team instances when user is member", async () => {
      vi.mocked(getSession).mockResolvedValueOnce(mockUser);
      vi.mocked(prisma.teamMember.findUnique).mockResolvedValueOnce({
        role: TeamRole.MEMBER,
      } as TeamMember);
      vi.mocked(prisma.team.findUnique).mockResolvedValueOnce({
        ...mockTeam,
        instances: [
          {
            instanceId: "instance-123",
            instance: {
              id: "instance-123",
              name: "Instance 1",
              status: "ONLINE",
            },
          },
        ],
      } as unknown as typeof mockTeam);

      const response = await getInstances(
        createRequest("http://localhost/api/teams/team-123/instances"),
        { params: createParams("team-123") }
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.instances).toHaveLength(1);
    });
  });

  describe("POST /api/teams/[id]/instances", () => {
    it("should return 401 when not authenticated", async () => {
      vi.mocked(getSession).mockResolvedValueOnce(null);

      const request = createRequest(
        "http://localhost/api/teams/team-123/instances",
        {
          method: "POST",
          body: { instanceId: "instance-123" },
        }
      );
      const response = await assignInstance(request, {
        params: createParams("team-123"),
      });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 403 when user is not ADMIN", async () => {
      vi.mocked(getSession).mockResolvedValueOnce(mockUser);
      vi.mocked(prisma.teamMember.findUnique).mockResolvedValueOnce({
        role: TeamRole.MEMBER,
      } as TeamMember);

      const request = createRequest(
        "http://localhost/api/teams/team-123/instances",
        {
          method: "POST",
          body: { instanceId: "instance-123" },
        }
      );
      const response = await assignInstance(request, {
        params: createParams("team-123"),
      });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Forbidden - insufficient permissions");
    });

    it("should assign instance successfully", async () => {
      vi.mocked(getSession).mockResolvedValueOnce(mockUser);
      vi.mocked(prisma.teamMember.findUnique).mockResolvedValueOnce({
        role: TeamRole.ADMIN,
      } as TeamMember);
      vi.mocked(prisma.instanceAssignment.create).mockResolvedValueOnce({
        id: "assignment-123",
        instanceId: "instance-123",
        teamId: "team-123",
        assignedAt: new Date(),
      });
      vi.mocked(prisma.auditLog.create).mockResolvedValueOnce({} as never);

      const request = createRequest(
        "http://localhost/api/teams/team-123/instances",
        {
          method: "POST",
          body: { instanceId: "instance-123" },
        }
      );
      const response = await assignInstance(request, {
        params: createParams("team-123"),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe("Instance assigned successfully");
    });
  });

  describe("DELETE /api/teams/[id]/instances/[instanceId]", () => {
    it("should return 401 when not authenticated", async () => {
      vi.mocked(getSession).mockResolvedValueOnce(null);

      const request = createRequest(
        "http://localhost/api/teams/team-123/instances/instance-123",
        {
          method: "DELETE",
        }
      );
      const response = await unassignInstance(request, {
        params: createInstanceParams("team-123", "instance-123"),
      });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should unassign instance successfully", async () => {
      vi.mocked(getSession).mockResolvedValueOnce(mockUser);
      vi.mocked(prisma.teamMember.findUnique).mockResolvedValueOnce({
        role: TeamRole.ADMIN,
      } as TeamMember);
      vi.mocked(prisma.instanceAssignment.delete).mockResolvedValueOnce({
        id: "assignment-123",
        instanceId: "instance-123",
        teamId: "team-123",
        assignedAt: new Date(),
      });
      vi.mocked(prisma.auditLog.create).mockResolvedValueOnce({} as never);

      const request = createRequest(
        "http://localhost/api/teams/team-123/instances/instance-123",
        {
          method: "DELETE",
        }
      );
      const response = await unassignInstance(request, {
        params: createInstanceParams("team-123", "instance-123"),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe("Instance unassigned successfully");
    });
  });
});
