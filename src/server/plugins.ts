import { prisma } from "@/lib/prisma";
import type { Plugin, PluginLog, AuditLog } from "@prisma/client";
import { PluginStatus } from "@prisma/client";
import type {
  PluginCreateInput,
  PluginUpdateInput,
  PluginFilters,
  PluginWithLogs,
  PluginSummary,
  PluginLogFilters,
  PluginLogCreateInput,
  PluginConfigUpdateInput,
} from "@/types/plugin";

// Get all plugins with optional filtering
export async function getPlugins(filters?: PluginFilters): Promise<Plugin[]> {
  const where: Record<string, unknown> = {};

  if (filters?.status) {
    where.status = filters.status;
  }
  if (filters?.instanceId) {
    where.instanceId = filters.instanceId;
  }
  if (filters?.enabled !== undefined) {
    where.enabled = filters.enabled;
  }
  if (filters?.category) {
    where.category = filters.category;
  }
  if (filters?.search) {
    where.name = { contains: filters.search, mode: "insensitive" };
  }

  const plugins = await prisma.plugin.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });

  return plugins;
}

// Get plugin by ID
export async function getPluginById(id: string): Promise<Plugin | null> {
  const plugin = await prisma.plugin.findUnique({
    where: { id },
  });
  return plugin;
}

// Get plugin with logs
export async function getPluginWithLogs(
  id: string,
  logLimit?: number
): Promise<PluginWithLogs | null> {
  const plugin = await prisma.plugin.findUnique({
    where: { id },
    include: {
      logs: {
        orderBy: { createdAt: "desc" },
        take: logLimit ?? 100,
      },
    },
  });

  return plugin;
}

// Get plugin summaries for dashboard
export async function getPluginSummaries(
  filters?: PluginFilters
): Promise<PluginSummary[]> {
  const plugins = await getPlugins(filters);

  // Get log counts for each plugin
  const summaries = await Promise.all(
    plugins.map(async (plugin) => {
      const logCount = await prisma.pluginLog.count({
        where: { pluginId: plugin.id },
      });

      const errorCount = await prisma.pluginLog.count({
        where: { pluginId: plugin.id, level: "error" },
      });

      return {
        id: plugin.id,
        name: plugin.name,
        version: plugin.version,
        description: plugin.description,
        status: plugin.status,
        enabled: plugin.enabled,
        category: plugin.category,
        instanceId: plugin.instanceId,
        lastError: plugin.lastError,
        lastErrorAt: plugin.lastErrorAt,
        logCount,
        errorCount,
        installedAt: plugin.installedAt,
      };
    })
  );

  return summaries;
}

// Create a new plugin (install)
export async function createPlugin(
  data: PluginCreateInput,
  userId: string
): Promise<Plugin> {
  const plugin = await prisma.plugin.create({
    data: {
      name: data.name,
      version: data.version,
      description: data.description ?? null,
      status: data.status ?? PluginStatus.INSTALLED,
      enabled: data.enabled ?? true,
      author: data.author ?? null,
      homepage: data.homepage ?? null,
      repository: data.repository ?? null,
      category: data.category ?? null,
      config: data.config ? JSON.parse(JSON.stringify(data.config)) : null,
      instanceId: data.instanceId ?? null,
      installedById: userId,
    },
  });

  // Create audit log
  await createPluginAuditLog({
    action: "INSTALL_PLUGIN",
    entityType: "Plugin",
    entityId: plugin.id,
    userId,
    pluginId: plugin.id,
    details: {
      name: plugin.name,
      version: plugin.version,
      category: plugin.category,
    },
  });

  return plugin;
}

// Update an existing plugin
export async function updatePlugin(
  id: string,
  data: PluginUpdateInput,
  userId: string
): Promise<Plugin | null> {
  const plugin = await prisma.plugin.update({
    where: { id },
    data: {
      name: data.name,
      version: data.version,
      description: data.description,
      status: data.status,
      enabled: data.enabled,
      author: data.author,
      homepage: data.homepage,
      repository: data.repository,
      category: data.category,
      config: data.config ? JSON.parse(JSON.stringify(data.config)) : undefined,
      instanceId: data.instanceId,
    },
  });

  // Create audit log
  await createPluginAuditLog({
    action: "UPDATE_PLUGIN",
    entityType: "Plugin",
    entityId: id,
    userId,
    pluginId: id,
    details: data as Record<string, unknown>,
  });

  return plugin;
}

// Delete a plugin (uninstall)
export async function deletePlugin(
  id: string,
  userId: string
): Promise<boolean> {
  // Update status to uninstalling first
  await prisma.plugin.update({
    where: { id },
    data: {
      status: PluginStatus.UNINSTALLING,
    },
  });

  // Create audit log
  await createPluginAuditLog({
    action: "UNINSTALL_PLUGIN",
    entityType: "Plugin",
    entityId: id,
    userId,
    pluginId: id,
  });

  // Delete all logs first
  await prisma.pluginLog.deleteMany({
    where: { pluginId: id },
  });

  // Delete the plugin
  await prisma.plugin.delete({
    where: { id },
  });

  return true;
}

// Enable/disable plugin
export async function setPluginEnabled(
  id: string,
  enabled: boolean,
  userId: string
): Promise<Plugin | null> {
  const plugin = await prisma.plugin.update({
    where: { id },
    data: {
      enabled,
      status: enabled ? PluginStatus.ACTIVE : PluginStatus.INACTIVE,
    },
  });

  await createPluginAuditLog({
    action: enabled ? "ENABLE_PLUGIN" : "DISABLE_PLUGIN",
    entityType: "Plugin",
    entityId: id,
    userId,
    pluginId: id,
    details: { enabled },
  });

  return plugin;
}

// Update plugin configuration
export async function updatePluginConfig(
  id: string,
  data: PluginConfigUpdateInput,
  userId: string
): Promise<Plugin | null> {
  const plugin = await prisma.plugin.update({
    where: { id },
    data: {
      config: JSON.parse(JSON.stringify(data.config)),
    },
  });

  await createPluginAuditLog({
    action: "UPDATE_PLUGIN_CONFIG",
    entityType: "Plugin",
    entityId: id,
    userId,
    pluginId: id,
    details: {
      configKeys: Object.keys(data.config),
    },
  });

  return plugin;
}

// Activate plugin (change status to active)
export async function activatePlugin(
  id: string,
  userId: string
): Promise<Plugin | null> {
  const plugin = await prisma.plugin.update({
    where: { id },
    data: {
      status: PluginStatus.ACTIVE,
      enabled: true,
      lastError: null,
      lastErrorAt: null,
    },
  });

  await createPluginAuditLog({
    action: "ACTIVATE_PLUGIN",
    entityType: "Plugin",
    entityId: id,
    userId,
    pluginId: id,
  });

  return plugin;
}

// Deactivate plugin (change status to inactive)
export async function deactivatePlugin(
  id: string,
  userId: string
): Promise<Plugin | null> {
  const plugin = await prisma.plugin.update({
    where: { id },
    data: {
      status: PluginStatus.INACTIVE,
      enabled: false,
    },
  });

  await createPluginAuditLog({
    action: "DEACTIVATE_PLUGIN",
    entityType: "Plugin",
    entityId: id,
    userId,
    pluginId: id,
  });

  return plugin;
}

// Record plugin error
export async function recordPluginError(
  id: string,
  error: string
): Promise<Plugin | null> {
  const plugin = await prisma.plugin.update({
    where: { id },
    data: {
      status: PluginStatus.ERROR,
      lastError: error,
      lastErrorAt: new Date(),
    },
  });

  // Also create an error log
  await createPluginLog(id, {
    level: "error",
    message: error,
    source: "system",
  });

  return plugin;
}

// Get plugin logs
export async function getPluginLogs(
  pluginId: string,
  filters?: PluginLogFilters
): Promise<PluginLog[]> {
  const where: Record<string, unknown> = {
    pluginId,
  };

  if (filters?.level) {
    where.level = filters.level;
  }
  if (filters?.source) {
    where.source = filters.source;
  }
  if (filters?.periodStart) {
    where.createdAt = { gte: filters.periodStart };
  }
  if (filters?.periodEnd) {
    where.createdAt = {
      ...(where.createdAt as Record<string, unknown>),
      lte: filters.periodEnd,
    };
  }

  const logs = await prisma.pluginLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: filters?.limit ?? 100,
  });

  return logs;
}

// Create a plugin log entry
export async function createPluginLog(
  pluginId: string,
  data: PluginLogCreateInput
): Promise<PluginLog> {
  const log = await prisma.pluginLog.create({
    data: {
      pluginId,
      level: data.level,
      message: data.message,
      source: data.source ?? null,
      details: data.details ? JSON.parse(JSON.stringify(data.details)) : null,
    },
  });

  return log;
}

// Clear plugin logs
export async function clearPluginLogs(
  pluginId: string,
  userId: string
): Promise<number> {
  const result = await prisma.pluginLog.deleteMany({
    where: { pluginId },
  });

  await createPluginAuditLog({
    action: "CLEAR_PLUGIN_LOGS",
    entityType: "Plugin",
    entityId: pluginId,
    userId,
    pluginId: pluginId,
    details: { clearedCount: result.count },
  });

  return result.count;
}

// Create audit log for plugin actions
export async function createPluginAuditLog(data: {
  action: string;
  entityType: string;
  entityId: string;
  userId: string;
  pluginId?: string;
  details?: Record<string, unknown>;
}): Promise<AuditLog> {
  return prisma.auditLog.create({
    data: {
      action: data.action,
      entityType: data.entityType,
      entityId: data.entityId,
      userId: data.userId,
      pluginId: data.pluginId ?? null,
      details: data.details ? JSON.parse(JSON.stringify(data.details)) : null,
    },
  });
}

// Get plugin status
export async function getPluginStatus(id: string): Promise<{
  status: PluginStatus;
  enabled: boolean;
  lastError: string | null;
  lastErrorAt: Date | null;
} | null> {
  const plugin = await prisma.plugin.findUnique({
    where: { id },
    select: {
      status: true,
      enabled: true,
      lastError: true,
      lastErrorAt: true,
    },
  });

  return plugin;
}

// Check if plugin exists by name
export async function pluginExistsByName(name: string): Promise<boolean> {
  const count = await prisma.plugin.count({
    where: { name },
  });
  return count > 0;
}
