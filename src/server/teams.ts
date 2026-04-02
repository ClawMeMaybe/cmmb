import { prisma } from "@/lib/prisma";
import type { Team, TeamMember, AuditLog } from "@prisma/client";
import { TeamRole, InstanceStatus } from "@prisma/client";
import type {
  TeamWithMembers,
  TeamWithInstances,
  TeamDashboardStats,
  TeamCreateInput,
  TeamUpdateInput,
  TeamMemberAddInput,
  TeamMemberRoleUpdateInput,
  InstanceAssignmentInput,
} from "@/types/team";

// Get all teams
export async function getTeams(): Promise<Team[]> {
  return prisma.team.findMany({
    orderBy: { createdAt: "desc" },
  });
}

// Get teams with members
export async function getTeamsWithMembers(): Promise<TeamWithMembers[]> {
  const teams = await prisma.team.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      members: {
        include: {
          user: {
            select: { id: true, email: true, name: true },
          },
        },
        orderBy: { joinedAt: "asc" },
      },
    },
  });
  return teams as TeamWithMembers[];
}

// Get team by ID
export async function getTeamById(id: string): Promise<Team | null> {
  return prisma.team.findUnique({
    where: { id },
  });
}

// Get team with members
export async function getTeamWithMembers(
  id: string
): Promise<TeamWithMembers | null> {
  const team = await prisma.team.findUnique({
    where: { id },
    include: {
      members: {
        include: {
          user: {
            select: { id: true, email: true, name: true },
          },
        },
        orderBy: { joinedAt: "asc" },
      },
    },
  });
  return team as TeamWithMembers | null;
}

// Get team with instances
export async function getTeamWithInstances(
  id: string
): Promise<TeamWithInstances | null> {
  const team = await prisma.team.findUnique({
    where: { id },
    include: {
      instances: {
        include: {
          instance: {
            select: { id: true, name: true, status: true },
          },
        },
      },
    },
  });
  return team as TeamWithInstances | null;
}

// Create team
export async function createTeam(data: TeamCreateInput): Promise<Team> {
  const team = await prisma.team.create({
    data: {
      name: data.name,
      description: data.description,
      ownerId: data.ownerId,
      members: {
        create: [
          // Owner is automatically a member with OWNER role
          {
            userId: data.ownerId,
            role: TeamRole.OWNER,
          },
          // Add initial members if provided
          ...(data.initialMembers?.map((member) => ({
            userId: member.userId,
            role: member.role ?? TeamRole.MEMBER,
          })) ?? []),
        ],
      },
    },
    include: {
      members: {
        include: {
          user: {
            select: { id: true, email: true, name: true },
          },
        },
      },
    },
  });

  // Create audit log
  await createTeamAuditLog({
    action: "CREATE_TEAM",
    teamId: team.id,
    userId: data.ownerId,
    details: { name: team.name, description: team.description },
  });

  return team;
}

// Update team
export async function updateTeam(
  id: string,
  data: TeamUpdateInput,
  userId: string
): Promise<Team | null> {
  const team = await prisma.team.update({
    where: { id },
    data,
  });

  // Create audit log
  await createTeamAuditLog({
    action: "UPDATE_TEAM",
    teamId: id,
    userId,
    details: data as Record<string, unknown>,
  });

  return team;
}

// Delete team
export async function deleteTeam(id: string, userId: string): Promise<boolean> {
  await prisma.team.delete({
    where: { id },
  });

  // Create audit log
  await createTeamAuditLog({
    action: "DELETE_TEAM",
    teamId: id,
    userId,
  });

  return true;
}

// Add member to team
export async function addTeamMember(
  data: TeamMemberAddInput
): Promise<TeamMember> {
  const member = await prisma.teamMember.create({
    data: {
      teamId: data.teamId,
      userId: data.userId,
      role: data.role ?? TeamRole.MEMBER,
    },
    include: {
      user: {
        select: { id: true, email: true, name: true },
      },
    },
  });

  // Create audit log
  await createTeamAuditLog({
    action: "ADD_TEAM_MEMBER",
    teamId: data.teamId,
    userId: data.userId,
    details: { memberId: data.userId, role: data.role ?? TeamRole.MEMBER },
  });

  return member;
}

// Remove member from team
export async function removeTeamMember(
  teamId: string,
  userId: string,
  removedByUserId: string
): Promise<boolean> {
  await prisma.teamMember.delete({
    where: {
      teamId_userId: { teamId, userId },
    },
  });

  // Create audit log
  await createTeamAuditLog({
    action: "REMOVE_TEAM_MEMBER",
    teamId,
    userId: removedByUserId,
    details: { memberId: userId },
  });

  return true;
}

// Update member role
export async function updateTeamMemberRole(
  data: TeamMemberRoleUpdateInput,
  updatedByUserId: string
): Promise<TeamMember | null> {
  const member = await prisma.teamMember.update({
    where: {
      teamId_userId: { teamId: data.teamId, userId: data.userId },
    },
    data: {
      role: data.role,
    },
    include: {
      user: {
        select: { id: true, email: true, name: true },
      },
    },
  });

  // Create audit log
  await createTeamAuditLog({
    action: "UPDATE_TEAM_MEMBER_ROLE",
    teamId: data.teamId,
    userId: updatedByUserId,
    details: { memberId: data.userId, newRole: data.role },
  });

  return member;
}

// Check if user has permission for team action
export async function checkTeamPermission(
  teamId: string,
  userId: string,
  requiredRole: TeamRole = TeamRole.MEMBER
): Promise<{ hasPermission: boolean; role: TeamRole | null }> {
  const member = await prisma.teamMember.findUnique({
    where: {
      teamId_userId: { teamId, userId },
    },
    select: { role: true },
  });

  if (!member) {
    return { hasPermission: false, role: null };
  }

  // Role hierarchy: OWNER > ADMIN > MEMBER
  const roleHierarchy = {
    [TeamRole.OWNER]: 3,
    [TeamRole.ADMIN]: 2,
    [TeamRole.MEMBER]: 1,
  };

  const hasPermission =
    roleHierarchy[member.role] >= roleHierarchy[requiredRole];

  return { hasPermission, role: member.role };
}

// Get teams for a user
export async function getTeamsForUser(
  userId: string
): Promise<TeamWithMembers[]> {
  const memberships = await prisma.teamMember.findMany({
    where: { userId },
    include: {
      team: {
        include: {
          members: {
            include: {
              user: {
                select: { id: true, email: true, name: true },
              },
            },
            orderBy: { joinedAt: "asc" },
          },
        },
      },
    },
    orderBy: { joinedAt: "desc" },
  });

  return memberships.map((m) => m.team as TeamWithMembers);
}

// Assign instance to team
export async function assignInstanceToTeam(
  data: InstanceAssignmentInput,
  userId: string
): Promise<{
  id: string;
  instanceId: string;
  teamId: string;
  assignedAt: Date;
}> {
  const assignment = await prisma.instanceAssignment.create({
    data: {
      instanceId: data.instanceId,
      teamId: data.teamId,
    },
  });

  // Create audit log
  await createTeamAuditLog({
    action: "ASSIGN_INSTANCE_TO_TEAM",
    teamId: data.teamId,
    userId,
    details: { instanceId: data.instanceId },
  });

  return assignment;
}

// Unassign instance from team
export async function unassignInstanceFromTeam(
  instanceId: string,
  teamId: string,
  userId: string
): Promise<boolean> {
  await prisma.instanceAssignment.delete({
    where: {
      instanceId_teamId: { instanceId, teamId },
    },
  });

  // Create audit log
  await createTeamAuditLog({
    action: "UNASSIGN_INSTANCE_FROM_TEAM",
    teamId,
    userId,
    details: { instanceId },
  });

  return true;
}

// Get team dashboard stats
export async function getTeamDashboardStats(
  teamId: string
): Promise<TeamDashboardStats | null> {
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    include: {
      members: {
        include: {
          user: {
            select: { id: true, email: true, name: true },
          },
        },
        orderBy: { joinedAt: "asc" },
      },
      instances: {
        include: {
          instance: {
            select: { id: true, name: true, status: true },
          },
        },
      },
    },
  });

  if (!team) {
    return null;
  }

  // Get instance IDs for this team
  const instanceIds = team.instances.map((ia) => ia.instanceId);

  // Get instance status counts
  const instances = await prisma.instance.findMany({
    where: { id: { in: instanceIds } },
    select: { status: true },
  });

  const onlineInstances = instances.filter(
    (i) => i.status === InstanceStatus.ONLINE
  ).length;
  const offlineInstances = instances.filter(
    (i) => i.status === InstanceStatus.OFFLINE
  ).length;
  const errorInstances = instances.filter(
    (i) => i.status === InstanceStatus.ERROR
  ).length;

  // Get channel count for team instances
  const channels = await prisma.channel.findMany({
    where: { instanceId: { in: instanceIds } },
    select: { id: true },
  });

  // Get active alerts for team instances
  const alerts = await prisma.alert.findMany({
    where: {
      instanceId: { in: instanceIds },
      status: "ACTIVE",
    },
    select: { id: true },
  });

  // Get recent audit logs for this team
  const recentLogs = await prisma.auditLog.findMany({
    where: {
      details: {
        path: "teamId",
        equals: teamId,
      },
    },
    orderBy: { createdAt: "desc" },
    take: 10,
    select: {
      id: true,
      action: true,
      createdAt: true,
      entityId: true,
      entityType: true,
    },
  });

  return {
    teamId: team.id,
    teamName: team.name,
    memberCount: team.members.length,
    instanceCount: team.instances.length,
    onlineInstances,
    offlineInstances,
    errorInstances,
    totalChannels: channels.length,
    activeAlerts: alerts.length,
    members: team.members.map((m) => ({
      id: m.user.id,
      email: m.user.email,
      name: m.user.name,
      role: m.role,
      joinedAt: m.joinedAt,
    })),
    recentActivity: recentLogs.map((log) => ({
      id: log.id,
      action: log.action,
      createdAt: log.createdAt,
      entityId: log.entityId,
      entityType: log.entityType,
    })),
  };
}

// Create team audit log
async function createTeamAuditLog(data: {
  action: string;
  teamId: string;
  userId: string;
  details?: Record<string, unknown>;
}): Promise<AuditLog> {
  return prisma.auditLog.create({
    data: {
      action: data.action,
      entityType: "Team",
      entityId: data.teamId,
      userId: data.userId,
      details: {
        ...data.details,
        teamId: data.teamId,
      },
    },
  });
}
