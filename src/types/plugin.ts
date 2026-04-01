// Plugin types for ClawMeMaybe

// Import Prisma-generated types
import { PluginStatus } from "@prisma/client";
import type { Plugin, PluginLog } from "@prisma/client";

// Re-export Prisma-generated types
export { PluginStatus } from "@prisma/client";
export type { Plugin, PluginLog } from "@prisma/client";

// Plugin with logs (for detailed view)
export interface PluginWithLogs extends Plugin {
  logs?: PluginLog[];
}

// Plugin summary for dashboard
export interface PluginSummary {
  id: string;
  name: string;
  version: string;
  description: string | null;
  status: PluginStatus;
  enabled: boolean;
  category: string | null;
  instanceId: string | null;
  lastError: string | null;
  lastErrorAt: Date | null;
  logCount: number;
  errorCount: number;
  installedAt: Date;
}

// Plugin create input
export interface PluginCreateInput {
  name: string;
  version: string;
  description?: string;
  status?: PluginStatus;
  enabled?: boolean;
  author?: string;
  homepage?: string;
  repository?: string;
  category?: string;
  config?: Record<string, unknown>;
  instanceId?: string;
}

// Plugin update input
export interface PluginUpdateInput {
  name?: string;
  version?: string;
  description?: string;
  status?: PluginStatus;
  enabled?: boolean;
  author?: string;
  homepage?: string;
  repository?: string;
  category?: string;
  config?: Record<string, unknown>;
  instanceId?: string;
}

// Plugin config update input
export interface PluginConfigUpdateInput {
  config: Record<string, unknown>;
}

// Plugin filters for listing
export interface PluginFilters {
  status?: PluginStatus;
  instanceId?: string;
  enabled?: boolean;
  category?: string;
  search?: string;
}

// Plugin log filters
export interface PluginLogFilters {
  level?: "info" | "warn" | "error" | "debug";
  source?: string;
  periodStart?: Date;
  periodEnd?: Date;
  limit?: number;
}

// Plugin log create input
export interface PluginLogCreateInput {
  level: "info" | "warn" | "error" | "debug";
  message: string;
  source?: string;
  details?: Record<string, unknown>;
}

// Plugin status response
export interface PluginStatusResponse {
  status: PluginStatus;
  enabled: boolean;
  lastError: string | null;
  lastErrorAt: Date | null;
  uptime?: number;
}

// Plugin install result
export interface PluginInstallResult {
  success: boolean;
  plugin?: Plugin;
  message: string;
  error?: string;
}

// Plugin uninstall result
export interface PluginUninstallResult {
  success: boolean;
  message: string;
  error?: string;
}

// Available plugin categories
export const PLUGIN_CATEGORIES = [
  {
    id: "channel",
    name: "Channel",
    description: "Communication channel integrations",
  },
  { id: "skill", name: "Skill", description: "Agent skills and capabilities" },
  { id: "tool", name: "Tool", description: "Agent tools and utilities" },
  {
    id: "integration",
    name: "Integration",
    description: "Third-party integrations",
  },
  { id: "other", name: "Other", description: "Other plugins" },
] as const;

export type PluginCategory = (typeof PLUGIN_CATEGORIES)[number]["id"];
