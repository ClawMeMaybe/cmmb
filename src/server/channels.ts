import { prisma } from "@/lib/prisma";
import type { Channel, AuditLog } from "@prisma/client";
import { ChannelStatus, ChannelType } from "@prisma/client";

export async function getChannels(): Promise<Channel[]> {
  const channels = await prisma.channel.findMany({
    orderBy: { createdAt: "desc" },
  });
  return channels;
}

export async function getChannelById(id: string): Promise<Channel | null> {
  const channel = await prisma.channel.findUnique({
    where: { id },
  });
  return channel;
}

export async function getChannelByName(name: string): Promise<Channel | null> {
  const channel = await prisma.channel.findUnique({
    where: { name },
  });
  return channel;
}

export async function createChannel(data: {
  name: string;
  type?: ChannelType;
  status?: ChannelStatus;
  enabled?: boolean;
  accountId?: string;
  config?: Record<string, unknown>;
  instanceId?: string;
}): Promise<Channel> {
  const channel = await prisma.channel.create({
    data: {
      name: data.name,
      type: data.type ?? ChannelType.OTHER,
      status: data.status ?? ChannelStatus.OFFLINE,
      enabled: data.enabled ?? true,
      accountId: data.accountId ?? null,
      config: data.config ? JSON.parse(JSON.stringify(data.config)) : null,
      instanceId: data.instanceId ?? null,
    },
  });

  return channel;
}

export async function updateChannel(
  id: string,
  data: Partial<{
    name: string;
    type: ChannelType;
    status: ChannelStatus;
    enabled: boolean;
    accountId: string;
    config: Record<string, unknown>;
    lastError: string | null;
    lastInbound: Date | null;
    lastOutbound: Date | null;
    instanceId: string | null;
  }>,
  userId: string
): Promise<Channel | null> {
  const channel = await prisma.channel.update({
    where: { id },
    data: {
      ...data,
      config: data.config ? JSON.parse(JSON.stringify(data.config)) : undefined,
    },
  });

  // Create audit log
  await createChannelAuditLog({
    action: "UPDATE_CHANNEL",
    entityType: "Channel",
    entityId: id,
    userId,
    channelId: id,
    details: data as Record<string, unknown>,
  });

  return channel;
}

export async function deleteChannel(
  id: string,
  userId: string
): Promise<boolean> {
  await prisma.channel.delete({
    where: { id },
  });

  // Create audit log
  await createChannelAuditLog({
    action: "DELETE_CHANNEL",
    entityType: "Channel",
    entityId: id,
    userId,
    channelId: id,
  });

  return true;
}

export async function createChannelAuditLog(data: {
  action: string;
  entityType: string;
  entityId: string;
  userId: string;
  channelId?: string;
  details?: Record<string, unknown>;
}): Promise<AuditLog> {
  return prisma.auditLog.create({
    data: {
      action: data.action,
      entityType: data.entityType,
      entityId: data.entityId,
      userId: data.userId,
      channelId: data.channelId ?? null,
      details: data.details ? JSON.parse(JSON.stringify(data.details)) : null,
    },
  });
}
