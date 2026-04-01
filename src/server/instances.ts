import { prisma } from "@/lib/prisma";
import type { Instance, AuditLog, Tag, InstanceTag } from "@prisma/client";
import { InstanceStatus } from "@prisma/client";

export type InstanceWithTags = Instance & {
  tags: (InstanceTag & { tag: Tag })[];
};

export async function getInstances(options?: {
  tagIds?: string[];
}): Promise<Instance[]> {
  const where = options?.tagIds
    ? {
        tags: {
          some: {
            tagId: { in: options.tagIds },
          },
        },
      }
    : undefined;

  const instances = await prisma.instance.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });
  return instances;
}

export async function getInstancesWithTags(options?: {
  tagIds?: string[];
}): Promise<InstanceWithTags[]> {
  const where = options?.tagIds
    ? {
        tags: {
          some: {
            tagId: { in: options.tagIds },
          },
        },
      }
    : undefined;

  const instances = await prisma.instance.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      tags: {
        include: { tag: true },
        orderBy: { tag: { name: "asc" } },
      },
    },
  });
  return instances;
}

export async function getInstanceById(id: string): Promise<Instance | null> {
  const instance = await prisma.instance.findUnique({
    where: { id },
  });
  return instance;
}

export async function createInstance(data: {
  name: string;
  description?: string | null;
  status?: InstanceStatus;
  gatewayUrl: string;
  token: string;
  createdById: string;
  tagIds?: string[];
}): Promise<Instance> {
  const instance = await prisma.instance.create({
    data: {
      name: data.name,
      description: data.description,
      status: data.status ?? InstanceStatus.OFFLINE,
      gatewayUrl: data.gatewayUrl,
      token: data.token,
      createdById: data.createdById,
      tags: data.tagIds
        ? {
            create: data.tagIds.map((tagId) => ({
              tagId,
              assignedBy: data.createdById,
            })),
          }
        : undefined,
    },
    include: {
      tags: {
        include: { tag: true },
      },
    },
  });

  // Create audit log
  await createAuditLog({
    action: "CREATE_INSTANCE",
    entityType: "Instance",
    entityId: instance.id,
    userId: data.createdById,
    details: { name: instance.name, gatewayUrl: instance.gatewayUrl },
  });

  return instance;
}

export async function updateInstance(
  id: string,
  data: Partial<{
    name: string;
    description: string | null;
    status: InstanceStatus;
    gatewayUrl: string;
    token: string;
  }>,
  userId: string
): Promise<Instance | null> {
  const instance = await prisma.instance.update({
    where: { id },
    data,
  });

  // Create audit log
  await createAuditLog({
    action: "UPDATE_INSTANCE",
    entityType: "Instance",
    entityId: id,
    userId,
    details: data as Record<string, unknown>,
  });

  return instance;
}

export async function deleteInstance(
  id: string,
  userId: string
): Promise<boolean> {
  await prisma.instance.delete({
    where: { id },
  });

  // Create audit log
  await createAuditLog({
    action: "DELETE_INSTANCE",
    entityType: "Instance",
    entityId: id,
    userId,
  });

  return true;
}

export async function createAuditLog(data: {
  action: string;
  entityType: string;
  entityId: string;
  userId: string;
  instanceId?: string;
  details?: Record<string, unknown>;
}): Promise<AuditLog> {
  return prisma.auditLog.create({
    data: {
      action: data.action,
      entityType: data.entityType,
      entityId: data.entityId,
      userId: data.userId,
      instanceId: data.instanceId ?? null,
      details: data.details ? JSON.parse(JSON.stringify(data.details)) : null,
    },
  });
}

export async function getAuditLogs(options?: {
  instanceId?: string;
  userId?: string;
  limit?: number;
}): Promise<AuditLog[]> {
  return prisma.auditLog.findMany({
    where: {
      instanceId: options?.instanceId,
      userId: options?.userId,
    },
    orderBy: { createdAt: "desc" },
    take: options?.limit ?? 100,
  });
}
