// Re-export Prisma-generated types
export { Role, InstanceStatus } from "@prisma/client";
export type { User, Instance, AuditLog } from "@prisma/client";

// API Response types
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

// Health check response
export interface HealthCheckResponse {
  status: "ok" | "error";
  timestamp: string;
  version?: string;
}
