// Re-export Prisma-generated types
export { Role, InstanceStatus } from "@prisma/client";
export type { User, Instance, AuditLog } from "@prisma/client";

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

// Skill types
export interface SkillMetadata {
  name: string;
  description: string;
  metadata?: Record<string, unknown>;
}

export interface Skill extends SkillMetadata {
  location: string;
  enabled: boolean;
  content?: string;
}
