// API key scopes for permission control
// Defined locally to ensure type safety
export type ApiKeyScope =
  | "READ_INSTANCES"
  | "WRITE_INSTANCES"
  | "READ_CHANNELS"
  | "WRITE_CHANNELS"
  | "READ_ALERTS"
  | "WRITE_ALERTS"
  | "READ_LOGS"
  | "READ_WORKSPACE"
  | "WRITE_WORKSPACE"
  | "ADMIN";

// Re-export Prisma-generated API key types
export type { ApiKey, ApiKeyUsage } from "@prisma/client";

// API key creation input
export interface ApiKeyCreateInput {
  name: string;
  description?: string | null;
  scopes: ApiKeyScope[];
  expiresAt?: Date | null;
}

// API key update input
export interface ApiKeyUpdateInput {
  name?: string;
  description?: string | null;
  scopes?: ApiKeyScope[];
  expiresAt?: Date | null;
}

// API key with usage statistics
export interface ApiKeyWithStats {
  id: string;
  key: string;
  name: string;
  description: string | null;
  scopes: ApiKeyScope[];
  expiresAt: Date | null;
  lastUsedAt: Date | null;
  revokedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
  usageCount: number;
  lastUsage?: {
    endpoint: string;
    method: string;
    statusCode: number;
    createdAt: Date;
  } | null;
}

// API key usage log entry
export interface ApiKeyUsageLog {
  id: string;
  endpoint: string;
  method: string;
  statusCode: number;
  ipAddress: string | null;
  userAgent: string | null;
  duration: number | null;
  createdAt: Date;
  apiKeyId: string;
}

// API key usage filter options
export interface ApiKeyUsageFilterOptions {
  apiKeyId?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

// API key list filter options
export interface ApiKeyFilterOptions {
  includeRevoked?: boolean;
  expiredOnly?: boolean;
  limit?: number;
  offset?: number;
}

// Raw API key response (key shown only on creation)
export interface ApiKeyCreateResponse {
  id: string;
  key: string; // Full key shown only once at creation
  name: string;
  description: string | null;
  scopes: ApiKeyScope[];
  expiresAt: Date | null;
  createdAt: Date;
}

// Scope descriptions for UI
export const API_KEY_SCOPE_DESCRIPTIONS: Record<ApiKeyScope, string> = {
  READ_INSTANCES: "View instance list and details",
  WRITE_INSTANCES: "Create, update, and delete instances",
  READ_CHANNELS: "View channel configurations",
  WRITE_CHANNELS: "Create, update, and delete channels",
  READ_ALERTS: "View alert configurations and alerts",
  WRITE_ALERTS: "Create, update, and resolve alerts",
  READ_LOGS: "View system and application logs",
  READ_WORKSPACE: "View workspace files and memory",
  WRITE_WORKSPACE: "Modify workspace files and memory",
  ADMIN: "Full administrative access (includes all scopes)",
};

// Scope groupings for easier selection
export const API_KEY_SCOPE_GROUPS = {
  instances: {
    label: "Instances",
    scopes: ["READ_INSTANCES", "WRITE_INSTANCES"] as ApiKeyScope[],
  },
  channels: {
    label: "Channels",
    scopes: ["READ_CHANNELS", "WRITE_CHANNELS"] as ApiKeyScope[],
  },
  alerts: {
    label: "Alerts",
    scopes: ["READ_ALERTS", "WRITE_ALERTS"] as ApiKeyScope[],
  },
  logs: {
    label: "Logs",
    scopes: ["READ_LOGS"] as ApiKeyScope[],
  },
  workspace: {
    label: "Workspace",
    scopes: ["READ_WORKSPACE", "WRITE_WORKSPACE"] as ApiKeyScope[],
  },
  admin: {
    label: "Admin",
    scopes: ["ADMIN"] as ApiKeyScope[],
  },
};
