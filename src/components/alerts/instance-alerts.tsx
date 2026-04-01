"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle,
  AlertCircle,
  Info,
  Bell,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import type { AlertSeverity } from "@/types";

interface AlertData {
  id: string;
  title: string;
  message: string;
  severity: AlertSeverity;
  status: string;
  createdAt: Date | string;
}

interface InstanceAlertsProps {
  instanceId: string;
}

const severityConfig: Record<
  AlertSeverity,
  { icon: React.ReactNode; color: string; bgColor: string; border: string }
> = {
  CRITICAL: {
    icon: <AlertCircle className="h-4 w-4" />,
    color: "text-red-500",
    bgColor: "bg-red-500/10",
    border: "border-red-500/50",
  },
  WARNING: {
    icon: <AlertTriangle className="h-4 w-4" />,
    color: "text-yellow-500",
    bgColor: "bg-yellow-500/10",
    border: "border-yellow-500/50",
  },
  INFO: {
    icon: <Info className="h-4 w-4" />,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    border: "border-blue-500/50",
  },
};

// Helper function to format relative time
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

export function InstanceAlerts({ instanceId }: InstanceAlertsProps) {
  const [alerts, setAlerts] = useState<AlertData[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAlerts() {
      try {
        const params = new URLSearchParams();
        params.set("instanceId", instanceId);
        params.set("status", "ACTIVE");
        params.set("pageSize", "10");

        const response = await fetch(`/api/alerts?${params.toString()}`);
        if (!response.ok) throw new Error("Failed to fetch alerts");
        const result = await response.json();
        setAlerts(result.data?.alerts ?? []);
      } catch (err) {
        console.error("Failed to fetch instance alerts:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchAlerts();
  }, [instanceId]);

  const handleAcknowledge = async (alertId: string) => {
    setProcessing(alertId);
    try {
      const response = await fetch(`/api/alerts/${alertId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ acknowledgedById: true }),
      });
      if (!response.ok) throw new Error("Failed to acknowledge");
      setAlerts((prev) => prev.filter((a) => a.id !== alertId));
    } catch (err) {
      console.error("Acknowledge error:", err);
    } finally {
      setProcessing(null);
    }
  };

  const handleResolve = async (alertId: string) => {
    setProcessing(alertId);
    try {
      const response = await fetch(`/api/alerts/${alertId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "RESOLVED" }),
      });
      if (!response.ok) throw new Error("Failed to resolve");
      setAlerts((prev) => prev.filter((a) => a.id !== alertId));
    } catch (err) {
      console.error("Resolve error:", err);
    } finally {
      setProcessing(null);
    }
  };

  if (loading) {
    return null;
  }

  if (alerts.length === 0) {
    return null;
  }

  const criticalCount = alerts.filter((a) => a.severity === "CRITICAL").length;
  const warningCount = alerts.filter((a) => a.severity === "WARNING").length;

  return (
    <Card className="border-red-500/30 bg-red-500/5">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Bell className="h-5 w-5 text-red-500" />
            <CardTitle className="text-lg">
              Active Alerts ({alerts.length})
            </CardTitle>
            {criticalCount > 0 && (
              <Badge className="bg-red-500 text-white">
                {criticalCount} Critical
              </Badge>
            )}
            {warningCount > 0 && (
              <Badge className="bg-yellow-500 text-white">
                {warningCount} Warning
              </Badge>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </div>
        <CardDescription>
          This instance has active alerts that require attention
        </CardDescription>
      </CardHeader>
      {expanded && (
        <CardContent className="pt-0">
          <div className="space-y-3">
            {alerts.slice(0, 5).map((alert) => {
              const config = severityConfig[alert.severity];
              return (
                <div
                  key={alert.id}
                  className={`p-3 rounded-lg ${config.bgColor} ${config.border} border`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <span className={config.color}>{config.icon}</span>
                      <span className="font-medium">{alert.title}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatRelativeTime(alert.createdAt)}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {alert.message}
                  </p>
                  <div className="flex gap-2 mt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleAcknowledge(alert.id)}
                      disabled={processing === alert.id}
                    >
                      Acknowledge
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleResolve(alert.id)}
                      disabled={processing === alert.id}
                    >
                      Resolve
                    </Button>
                  </div>
                </div>
              );
            })}
            {alerts.length > 5 && (
              <p className="text-sm text-muted-foreground text-center">
                And {alerts.length - 5} more alerts...
              </p>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
