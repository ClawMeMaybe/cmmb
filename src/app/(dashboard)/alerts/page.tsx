"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertTriangle, RefreshCw, CheckCircle2 } from "lucide-react";
import { AlertList, AlertWithRelations } from "@/components/alerts/alert-list";
import type { AlertSeverity, AlertStatus } from "@/types";

interface AlertsData {
  alerts: AlertWithRelations[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  activeCount: number;
}

export default function AlertsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [data, setData] = useState<AlertsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const statusFilter = searchParams.get("status") as AlertStatus | null;
  const severityFilter = searchParams.get("severity") as AlertSeverity | null;
  const page = parseInt(searchParams.get("page") || "1", 10);

  const fetchAlerts = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);
      if (severityFilter) params.set("severity", severityFilter);
      params.set("page", page.toString());

      const response = await fetch(`/api/alerts?${params.toString()}`);
      if (!response.ok) {
        throw new Error("Failed to fetch alerts");
      }
      const result = await response.json();
      setData(result.data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [statusFilter, severityFilter, page]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchAlerts();
  };

  const handleFilterChange = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all") {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    params.set("page", "1"); // Reset to first page on filter change
    router.push(`/alerts?${params.toString()}`);
  };

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", newPage.toString());
    router.push(`/alerts?${params.toString()}`);
  };

  const handleAcknowledge = async (alertId: string) => {
    try {
      const response = await fetch(`/api/alerts/${alertId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ acknowledgedById: true }),
      });
      if (!response.ok) throw new Error("Failed to acknowledge alert");
      await fetchAlerts();
    } catch (err) {
      console.error("Acknowledge error:", err);
    }
  };

  const handleResolve = async (alertId: string) => {
    try {
      const response = await fetch(`/api/alerts/${alertId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "RESOLVED" }),
      });
      if (!response.ok) throw new Error("Failed to resolve alert");
      await fetchAlerts();
    } catch (err) {
      console.error("Resolve error:", err);
    }
  };

  const handleDelete = async (alertId: string) => {
    try {
      const response = await fetch(`/api/alerts/${alertId}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete alert");
      await fetchAlerts();
    } catch (err) {
      console.error("Delete error:", err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <p>Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 p-8">
        <p className="text-destructive">{error}</p>
        <Button onClick={handleRefresh}>Retry</Button>
      </div>
    );
  }

  const activeCount = data?.activeCount ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Alerts</h1>
          <p className="text-muted-foreground">
            Monitor and manage system alerts
          </p>
        </div>
        <div className="flex items-center gap-4">
          {activeCount > 0 && (
            <Badge className="bg-red-500 text-white">
              {activeCount} Active
            </Badge>
          )}
          <Button
            variant="outline"
            size="icon"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw
              className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
            />
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>
            Filter alerts by status and severity
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Status:</span>
              <Select
                value={statusFilter ?? "all"}
                onValueChange={(value) =>
                  handleFilterChange("status", value ?? "all")
                }
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="ACKNOWLEDGED">Acknowledged</SelectItem>
                  <SelectItem value="RESOLVED">Resolved</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Severity:</span>
              <Select
                value={severityFilter ?? "all"}
                onValueChange={(value) =>
                  handleFilterChange("severity", value ?? "all")
                }
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="All severities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="CRITICAL">Critical</SelectItem>
                  <SelectItem value="WARNING">Warning</SelectItem>
                  <SelectItem value="INFO">Info</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Alert Summary */}
      {activeCount > 0 && (
        <Card className="border-red-500/50 bg-red-500/5">
          <CardContent className="flex items-center gap-4 py-4">
            <AlertTriangle className="h-8 w-8 text-red-500" />
            <div>
              <p className="font-medium text-red-500">
                {activeCount} Active Alerts
              </p>
              <p className="text-sm text-muted-foreground">
                There are active alerts that require attention
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Alert List */}
      {data && (
        <AlertList
          alerts={data.alerts}
          pagination={data.pagination}
          activeCount={data.activeCount}
          onPageChange={handlePageChange}
          onAcknowledge={handleAcknowledge}
          onResolve={handleResolve}
          onDelete={handleDelete}
          isLoading={refreshing}
        />
      )}

      {data?.alerts.length === 0 && activeCount === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CheckCircle2 className="h-16 w-16 text-green-500 mb-4" />
            <p className="text-lg font-medium">All Systems Normal</p>
            <p className="text-sm text-muted-foreground">
              No alerts to display. All instances are operating normally.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
