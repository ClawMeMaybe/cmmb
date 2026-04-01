import { prisma } from "./prisma";
import type { AuditLog } from "@prisma/client";

/**
 * Action types for audit logging
 */
export const AuditActions = {
  // Authentication
  LOGIN: "LOGIN",
  LOGOUT: "LOGOUT",
  LOGIN_FAILED: "LOGIN_FAILED",

  // Instance management
  CREATE_INSTANCE: "CREATE_INSTANCE",
  UPDATE_INSTANCE: "UPDATE_INSTANCE",
  DELETE_INSTANCE: "DELETE_INSTANCE",
  START_INSTANCE: "START_INSTANCE",
  STOP_INSTANCE: "STOP_INSTANCE",
  RESTART_INSTANCE: "RESTART_INSTANCE",

  // User management (for future use)
  CREATE_USER: "CREATE_USER",
  UPDATE_USER: "UPDATE_USER",
  DELETE_USER: "DELETE_USER",
} as const;

export type AuditAction = (typeof AuditActions)[keyof typeof AuditActions];

/**
 * Entity types for audit logging
 */
export const EntityTypes = {
  USER: "User",
  INSTANCE: "Instance",
  SESSION: "Session",
} as const;

export type EntityType = (typeof EntityTypes)[keyof typeof EntityTypes];

/**
 * Options for creating an audit log entry
 */
export interface CreateAuditLogOptions {
  action: string;
  entityType: string;
  entityId: string;
  userId: string;
  instanceId?: string;
  details?: Record<string, unknown>;
}

/**
 * Create an audit log entry
 */
export async function createAuditLog(
  options: CreateAuditLogOptions
): Promise<AuditLog | null> {
  // Skip audit log if userId is invalid (e.g., "unknown" for failed login attempts)
  if (options.userId === "unknown" || !options.userId) {
    console.log("Skipping audit log: invalid userId", options.action);
    return null;
  }

  return prisma.auditLog.create({
    data: {
      action: options.action,
      entityType: options.entityType,
      entityId: options.entityId,
      userId: options.userId,
      instanceId: options.instanceId ?? null,
      details: options.details
        ? JSON.parse(JSON.stringify(options.details))
        : null,
    },
  });
}

/**
 * Options for querying audit logs
 */
export interface GetAuditLogsOptions {
  userId?: string;
  action?: string;
  entityType?: string;
  entityId?: string;
  instanceId?: string;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  pageSize?: number;
}

/**
 * Get audit logs with filtering and pagination
 */
export async function getAuditLogs(options: GetAuditLogsOptions = {}) {
  const {
    userId,
    action,
    entityType,
    entityId,
    instanceId,
    startDate,
    endDate,
    page = 1,
    pageSize = 50,
  } = options;

  const where = {
    ...(userId && { userId }),
    ...(action && { action }),
    ...(entityType && { entityType }),
    ...(entityId && { entityId }),
    ...(instanceId && { instanceId }),
    ...(startDate && { createdAt: { gte: startDate } }),
    ...(endDate && { createdAt: { lte: endDate } }),
  };

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    }),
    prisma.auditLog.count({ where }),
  ]);

  return {
    logs,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  };
}

/**
 * Get unique action types for filtering
 */
export async function getAuditActionTypes(): Promise<string[]> {
  const actions = await prisma.auditLog.findMany({
    select: { action: true },
    distinct: ["action"],
    orderBy: { action: "asc" },
  });
  return actions.map((a) => a.action);
}
