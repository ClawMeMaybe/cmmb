import { prisma } from "@/lib/prisma";
import type { Instance } from "@prisma/client";
import { InstanceStatus } from "@prisma/client";
import { createAuditLog, AuditActions, EntityTypes } from "@/lib/audit";

export async function getInstances(): Promise<Instance[]> {
  const instances = await prisma.instance.findMany({
    orderBy: { createdAt: "desc" },
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
}): Promise<Instance> {
  const instance = await prisma.instance.create({
    data: {
      name: data.name,
      description: data.description,
      status: data.status ?? InstanceStatus.OFFLINE,
      gatewayUrl: data.gatewayUrl,
      token: data.token,
      createdById: data.createdById,
    },
  });

  // Create audit log
  await createAuditLog({
    action: AuditActions.CREATE_INSTANCE,
    entityType: EntityTypes.INSTANCE,
    entityId: instance.id,
    userId: data.createdById,
    instanceId: instance.id,
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
    action: AuditActions.UPDATE_INSTANCE,
    entityType: EntityTypes.INSTANCE,
    entityId: id,
    userId,
    instanceId: id,
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
    action: AuditActions.DELETE_INSTANCE,
    entityType: EntityTypes.INSTANCE,
    entityId: id,
    userId,
    instanceId: id,
  });

  return true;
}
