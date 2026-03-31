// Re-export Prisma-generated types
export { Role, InstanceStatus } from "@prisma/client";
export type { User, Instance, AuditLog } from "@prisma/client";

// Device types
export type { PairedDevice, PairedDevices } from "./device";

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
