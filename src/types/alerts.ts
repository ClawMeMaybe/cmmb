// Re-export Prisma-generated alert types
export { AlertSeverity, AlertStatus } from "@prisma/client";
export type { AlertConfig, Alert } from "@prisma/client";

// Alert configuration input types
export interface AlertConfigInput {
  name: string;
  description?: string | null;
  enabled?: boolean;
  metricType: string;
  operator: string;
  threshold: number;
  duration?: number;
  emailEnabled?: boolean;
  emailRecipients?: string | null;
}

export interface AlertConfigUpdateInput {
  name?: string;
  description?: string | null;
  enabled?: boolean;
  metricType?: string;
  operator?: string;
  threshold?: number;
  duration?: number;
  emailEnabled?: boolean;
  emailRecipients?: string | null;
}

// Alert creation input
export interface AlertCreateInput {
  configId?: string | null;
  instanceId?: string | null;
  severity?: "INFO" | "WARNING" | "CRITICAL";
  title: string;
  message: string;
  details?: Record<string, unknown> | null;
  metricType: string;
  metricValue?: number | null;
  threshold?: number | null;
}

// Alert acknowledgment input
export interface AlertAcknowledgeInput {
  note?: string;
}

// Metric types that can be used for alerts
export type AlertMetricType =
  | "cpu"
  | "memory"
  | "status_offline"
  | "status_error"
  | "request_count";

// Operators for threshold comparison
export type AlertOperator = ">" | ">=" | "<" | "<=" | "==" | "!=";

// Alert filter options for listing alerts
export interface AlertFilterOptions {
  status?: "ACTIVE" | "ACKNOWLEDGED" | "RESOLVED";
  severity?: "INFO" | "WARNING" | "CRITICAL";
  instanceId?: string;
  configId?: string;
  limit?: number;
  offset?: number;
}

// Alert with related data
export interface AlertWithRelations {
  id: string;
  configId: string | null;
  instanceId: string | null;
  severity: "INFO" | "WARNING" | "CRITICAL";
  status: "ACTIVE" | "ACKNOWLEDGED" | "RESOLVED";
  title: string;
  message: string;
  details: Record<string, unknown> | null;
  metricType: string;
  metricValue: number | null;
  threshold: number | null;
  acknowledgedAt: Date | null;
  acknowledgedById: string | null;
  acknowledgmentNote: string | null;
  resolvedAt: Date | null;
  emailSentAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  config?: {
    id: string;
    name: string;
    metricType: string;
  } | null;
  instance?: {
    id: string;
    name: string;
    status: string;
  } | null;
  acknowledgedBy?: {
    id: string;
    name: string | null;
    email: string;
  } | null;
}

// Alert summary for dashboard
export interface AlertSummary {
  totalActive: number;
  totalAcknowledged: number;
  totalResolved: number;
  bySeverity: {
    INFO: number;
    WARNING: number;
    CRITICAL: number;
  };
  recentAlerts: AlertWithRelations[];
}
