"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertTriangle,
  Info,
  AlertCircle,
  CheckCircle2,
  Clock,
  User,
  Server,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import type { AlertSeverity, AlertStatus } from "@/types";

// Alert type with relations for display
export interface AlertWithRelations {
  id: string;
  title: string;
  message: string;
  severity: AlertSeverity;
  status: AlertStatus;
  source: string;
  createdAt: Date | string;
  updatedAt: Date | string;
  resolvedAt: Date | string | null;
  instanceId: string | null;
  acknowledgedById: string | null;
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

interface AlertListProps {
  alerts: AlertWithRelations[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  activeCount: number;
  onPageChange: (page: number) => void;
  onAcknowledge: (alertId: string) => void;
  onResolve: (alertId: string) => void;
  onDelete: (alertId: string) => void;
  isLoading?: boolean;
}

const severityConfig: Record<
  AlertSeverity,
  { icon: React.ReactNode; color: string; bgColor: string }
> = {
  CRITICAL: {
    icon: <AlertCircle className="h-4 w-4" />,
    color: "text-red-500",
    bgColor: "bg-red-500/10",
  },
  WARNING: {
    icon: <AlertTriangle className="h-4 w-4" />,
    color: "text-yellow-500",
    bgColor: "bg-yellow-500/10",
  },
  INFO: {
    icon: <Info className="h-4 w-4" />,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
  },
};

const statusConfig: Record<AlertStatus, { label: string; color: string }> = {
  ACTIVE: { label: "Active", color: "bg-red-500" },
  ACKNOWLEDGED: { label: "Acknowledged", color: "bg-yellow-500" },
  RESOLVED: { label: "Resolved", color: "bg-green-500" },
};

// Helper function to format relative time without date-fns
function formatRelativeTime(date: Date | string): string {
  const now = new Date();
  const past = new Date(date);
  const diffMs = now.getTime() - past.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) {
    return "just now";
  }
  if (diffMinutes < 60) {
    return `${diffMinutes} minute${diffMinutes !== 1 ? "s" : ""} ago`;
  }
  if (diffHours < 24) {
    return `${diffHours} hour${diffHours !== 1 ? "s" : ""} ago`;
  }
  if (diffDays < 7) {
    return `${diffDays} day${diffDays !== 1 ? "s" : ""} ago`;
  }
  return past.toLocaleDateString();
}

export function AlertList({
  alerts,
  pagination,
  activeCount,
  onPageChange,
  onAcknowledge,
  onResolve,
  onDelete,
  isLoading,
}: AlertListProps) {
  if (alerts.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-8">
          <CheckCircle2 className="h-12 w-12 text-green-500 mb-4" />
          <p className="text-lg font-medium">No alerts found</p>
          <p className="text-sm text-muted-foreground">
            {activeCount === 0
              ? "All systems are operating normally"
              : "Try adjusting your filters"}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {alerts.map((alert) => {
        const config = severityConfig[alert.severity];
        const statusConf = statusConfig[alert.status];

        return (
          <Card key={alert.id} className={`${config.bgColor} border-l-4`}>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <span className={config.color}>{config.icon}</span>
                  <CardTitle className="text-lg">{alert.title}</CardTitle>
                  <Badge className={`${statusConf.color} text-white`}>
                    {statusConf.label}
                  </Badge>
                </div>
                <Badge variant="outline">{alert.severity}</Badge>
              </div>
              <CardDescription className="flex items-center gap-4 mt-2">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatRelativeTime(alert.createdAt)}
                </span>
                {alert.instance && (
                  <span className="flex items-center gap-1">
                    <Server className="h-3 w-3" />
                    {alert.instance.name}
                  </span>
                )}
                {alert.acknowledgedBy && (
                  <span className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {alert.acknowledgedBy.name || alert.acknowledgedBy.email}
                  </span>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                {alert.message}
              </p>
              <div className="flex gap-2">
                {alert.status === "ACTIVE" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onAcknowledge(alert.id)}
                    disabled={isLoading}
                  >
                    Acknowledge
                  </Button>
                )}
                {(alert.status === "ACTIVE" ||
                  alert.status === "ACKNOWLEDGED") && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onResolve(alert.id)}
                    disabled={isLoading}
                  >
                    Resolve
                  </Button>
                )}
                {alert.status === "RESOLVED" && (
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => onDelete(alert.id)}
                    disabled={isLoading}
                  >
                    Delete
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}

      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {(pagination.page - 1) * pagination.pageSize + 1} to{" "}
            {Math.min(pagination.page * pagination.pageSize, pagination.total)}{" "}
            of {pagination.total} alerts
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(pagination.page - 1)}
              disabled={pagination.page <= 1 || isLoading}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages || isLoading}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
