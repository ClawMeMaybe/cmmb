import type { Team, TeamMember, TeamRole } from "@prisma/client";

// Re-export Prisma types
export type { Team, TeamMember };
export { TeamRole } from "@prisma/client";

// Team with members
export interface TeamWithMembers extends Team {
  members: (TeamMember & {
    user: { id: string; email: string; name: string | null };
  })[];
}

// Team with instance assignments
export interface TeamWithInstances extends Team {
  instances: {
    id: string;
    instanceId: string;
    instance: { id: string; name: string; status: string };
  }[];
}

// Team dashboard stats
export interface TeamDashboardStats {
  teamId: string;
  teamName: string;
  memberCount: number;
  instanceCount: number;
  onlineInstances: number;
  offlineInstances: number;
  errorInstances: number;
  totalChannels: number;
  activeAlerts: number;
  members: Array<{
    id: string;
    email: string;
    name: string | null;
    role: TeamRole;
    joinedAt: Date;
  }>;
  recentActivity: Array<{
    id: string;
    action: string;
    createdAt: Date;
    entityId: string;
    entityType: string;
  }>;
}

// Team create input
export interface TeamCreateInput {
  name: string;
  description?: string;
  ownerId: string;
  initialMembers?: Array<{
    userId: string;
    role?: TeamRole;
  }>;
}

// Team update input
export interface TeamUpdateInput {
  name?: string;
  description?: string;
}

// Team member add input
export interface TeamMemberAddInput {
  teamId: string;
  userId: string;
  role?: TeamRole;
}

// Team member role update input
export interface TeamMemberRoleUpdateInput {
  teamId: string;
  userId: string;
  role: TeamRole;
}

// Team permission check result
export interface TeamPermissionResult {
  hasPermission: boolean;
  role: TeamRole | null;
}

// Instance assignment input
export interface InstanceAssignmentInput {
  instanceId: string;
  teamId: string;
}
