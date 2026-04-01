// Re-export Prisma-generated types
export {
  Role,
  InstanceStatus,
  ChannelType,
  ChannelStatus,
} from "@prisma/client";
export type {
  User,
  Instance,
  Channel,
  AuditLog,
  Session,
} from "@prisma/client";

// Device types
export type { PairedDevice, PairedDevices } from "./device";

// Log types
export type {
  LogLevel,
  LogSource,
  LogEntry,
  LogEntryResponse,
  LogsQueryParams,
  LogsPagination,
  LogsApiResponse,
  LogStreamMessageType,
  LogStreamClientMessage,
  LogStreamServerMessage,
  LogFilterState,
  LogExportFormat,
  LogExportOptions,
  LogStreamConnectionState,
  UseLogStreamReturn,
} from "./logs";
export {
  LOG_LEVEL_COLORS,
  LOG_SOURCE_LABELS,
  DEFAULT_LOG_LEVELS,
  MAX_STREAM_LOGS,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
} from "./logs";

// API Response types
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

// Health check types
export interface HealthCheckResult {
  status: "ok" | "error" | "pending" | "skipped";
  message?: string;
}

export interface HealthCheckDetail {
  status: "ok" | "error";
  timestamp: string;
  version?: string;
  checks: {
    database: HealthCheckResult;
    gateway?: HealthCheckResult;
  };
}

export type HealthCheckResponse = HealthCheckDetail;

// Gateway types
export interface GatewayStatus {
  status: "ok" | "error" | "offline";
  version?: string;
  uptime?: number;
  gatewayUrl?: string;
}

export interface GatewayConfig {
  gatewayUrl: string;
  hasToken: boolean;
}

export interface GatewayTestResult {
  success: boolean;
  message: string;
  details?: {
    version?: string;
    uptime?: number;
  };
}

// Skill types
export interface SkillMetadata {
  name: string;
  description?: string;
  metadata?: Record<string, unknown>;
}

export interface Skill extends SkillMetadata {
  location: string;
  enabled: boolean;
  content?: string;
}

// Workspace types
export type {
  WorkspaceFile,
  WorkspaceFileContent,
  MemoryType,
  MemoryEntry,
  MemoryEntryInput,
  MemoryEntryUpdate,
  RuleConfig,
  RulesConfig,
  WorkspaceBackupData,
  BackupCreateInput,
  WorkspaceDirectory,
  WorkspaceStats,
  FrontmatterContent,
} from "./workspace";

// Agent types
export type {
  Agent,
  AgentMetric,
  AgentModelConfig,
  AgentCapabilities,
  AgentWithMetrics,
  AgentMetricSummary,
  AgentTestRequest,
  AgentTestResponse,
  AgentCreateInput,
  AgentUpdateInput,
  AgentFilters,
  AgentMetricsQueryParams,
  AvailableModelId,
} from "./agent";
export {
  AgentStatus,
  AVAILABLE_MODELS,
  DEFAULT_AGENT_CONFIG,
  DEFAULT_AGENT_CAPABILITIES,
} from "./agent";

// Plugin types
export type {
  Plugin,
  PluginLog,
  PluginWithLogs,
  PluginSummary,
  PluginCreateInput,
  PluginUpdateInput,
  PluginConfigUpdateInput,
  PluginFilters,
  PluginLogFilters,
  PluginLogCreateInput,
  PluginStatusResponse,
  PluginInstallResult,
  PluginUninstallResult,
  PluginCategory,
} from "./plugin";
export { PluginStatus, PLUGIN_CATEGORIES } from "./plugin";
