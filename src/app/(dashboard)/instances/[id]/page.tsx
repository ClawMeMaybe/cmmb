"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";
import {
  RefreshCw,
  Cpu,
  MemoryStick,
  Clock,
  Activity,
  ArrowLeft,
  ExternalLink,
  Edit,
} from "lucide-react";
import Link from "next/link";
import { DeleteDialog } from "@/components/instances/delete-dialog";
import type { Instance } from "@/types";
import type { InstanceStatus } from "@prisma/client";

interface InstanceMetrics {
  instanceId: string;
  status: "online" | "offline" | "error";
  cpu: number | null;
  memory: number | null;
  uptime: number | null;
  requestCount: number | null;
  lastChecked: string;
  error?: string;
}

interface MetricPoint {
  timestamp: string;
  cpu: number;
  memory: number;
}

const statusColors: Record<InstanceStatus, string> = {
  ONLINE: "bg-green-500",
  OFFLINE: "bg-gray-500",
  STARTING: "bg-yellow-500",
  STOPPING: "bg-yellow-500",
  ERROR: "bg-red-500",
};

const metricsStatusColors: Record<string, string> = {
  online: "bg-green-500",
  offline: "bg-gray-500",
  error: "bg-red-500",
};

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return num.toString();
}

export default function InstanceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [instance, setInstance] = useState<Instance | null>(null);
  const [metrics, setMetrics] = useState<InstanceMetrics | null>(null);
  const [metricsHistory, setMetricsHistory] = useState<MetricPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchInstance = async () => {
    try {
      const response = await fetch(`/api/instances/${params.id}`);
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("Instance not found");
        }
        throw new Error("Failed to fetch instance");
      }
      const data = await response.json();
      setInstance(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const fetchMetrics = async (addToHistory = true) => {
    try {
      const response = await fetch(`/api/instances/${params.id}/metrics`);
      if (!response.ok) throw new Error("Failed to fetch metrics");
      const data = await response.json();
      setMetrics(data.data);

      // Add to history for charting
      if (addToHistory && data.data.cpu !== null && data.data.memory !== null) {
        const now = new Date();
        const timestamp = now.toLocaleTimeString();
        setMetricsHistory((prev) => {
          const newHistory = [
            ...prev,
            { timestamp, cpu: data.data.cpu, memory: data.data.memory },
          ].slice(-20); // Keep last 20 points
          return newHistory;
        });
      }
    } catch (err) {
      console.error("Failed to fetch metrics:", err);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchInstance(), fetchMetrics()]);
    setRefreshing(false);
  };

  useEffect(() => {
    if (params.id) {
      fetchInstance();
      fetchMetrics();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  // Auto-refresh metrics every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchMetrics();
    }, 30000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        <Button onClick={() => router.back()}>Go Back</Button>
      </div>
    );
  }

  if (!instance) {
    return (
      <div className="flex items-center justify-center p-8">
        <p>Instance not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {instance.name}
            </h1>
            <p className="text-muted-foreground">
              {instance.description || "No description"}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
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
          <Link href={`/instances/${instance.id}/edit`}>
            <Button variant="outline">
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </Button>
          </Link>
          {instance.gatewayUrl && (
            <Button
              variant="outline"
              onClick={() => window.open(instance.gatewayUrl, "_blank")}
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              Open Gateway
            </Button>
          )}
          <DeleteDialog instanceId={instance.id} instanceName={instance.name} />
        </div>
      </div>

      {/* Metrics Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Status</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Badge
                className={`${
                  metricsStatusColors[metrics?.status || "offline"]
                } text-white`}
              >
                {metrics?.status?.toUpperCase() || "UNKNOWN"}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {metrics?.error ||
                "Last checked: " +
                  (metrics?.lastChecked
                    ? new Date(metrics.lastChecked).toLocaleTimeString()
                    : "N/A")}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">CPU Usage</CardTitle>
            <Cpu className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics?.cpu !== null && metrics?.cpu !== undefined
                ? `${metrics.cpu.toFixed(1)}%`
                : "N/A"}
            </div>
            <div className="mt-2 h-2 w-full rounded-full bg-secondary">
              <div
                className="h-2 rounded-full bg-primary transition-all"
                style={{
                  width: `${metrics?.cpu ?? 0}%`,
                }}
              />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Memory Usage</CardTitle>
            <MemoryStick className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics?.memory !== null && metrics?.memory !== undefined
                ? `${metrics.memory.toFixed(1)}%`
                : "N/A"}
            </div>
            <div className="mt-2 h-2 w-full rounded-full bg-secondary">
              <div
                className="h-2 rounded-full bg-primary transition-all"
                style={{
                  width: `${metrics?.memory ?? 0}%`,
                }}
              />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Uptime</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics?.uptime !== null && metrics?.uptime !== undefined
                ? formatUptime(metrics.uptime)
                : "N/A"}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Requests:{" "}
              {metrics?.requestCount !== null &&
              metrics?.requestCount !== undefined
                ? formatNumber(metrics.requestCount)
                : "N/A"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Metrics Charts */}
      {metricsHistory.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>CPU Usage Over Time</CardTitle>
              <CardDescription>
                Last 20 data points (refreshes every 30s)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={metricsHistory}>
                    <defs>
                      <linearGradient
                        id="cpuGradient"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="hsl(var(--primary))"
                          stopOpacity={0.3}
                        />
                        <stop
                          offset="95%"
                          stopColor="hsl(var(--primary))"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      className="stroke-muted"
                    />
                    <XAxis
                      dataKey="timestamp"
                      tick={{ fontSize: 10 }}
                      className="text-muted-foreground"
                    />
                    <YAxis
                      domain={[0, 100]}
                      tick={{ fontSize: 10 }}
                      className="text-muted-foreground"
                      tickFormatter={(value) => `${value}%`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "6px",
                      }}
                      formatter={(value) =>
                        typeof value === "number"
                          ? [`${value.toFixed(1)}%`, "CPU"]
                          : [value, "CPU"]
                      }
                    />
                    <Area
                      type="monotone"
                      dataKey="cpu"
                      stroke="hsl(var(--primary))"
                      fill="url(#cpuGradient)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Memory Usage Over Time</CardTitle>
              <CardDescription>
                Last 20 data points (refreshes every 30s)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={metricsHistory}>
                    <defs>
                      <linearGradient
                        id="memoryGradient"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="#10b981"
                          stopOpacity={0.3}
                        />
                        <stop
                          offset="95%"
                          stopColor="#10b981"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      className="stroke-muted"
                    />
                    <XAxis
                      dataKey="timestamp"
                      tick={{ fontSize: 10 }}
                      className="text-muted-foreground"
                    />
                    <YAxis
                      domain={[0, 100]}
                      tick={{ fontSize: 10 }}
                      className="text-muted-foreground"
                      tickFormatter={(value) => `${value}%`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "6px",
                      }}
                      formatter={(value) =>
                        typeof value === "number"
                          ? [`${value.toFixed(1)}%`, "Memory"]
                          : [value, "Memory"]
                      }
                    />
                    <Area
                      type="monotone"
                      dataKey="memory"
                      stroke="#10b981"
                      fill="url(#memoryGradient)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Instance Details */}
      <Card>
        <CardHeader>
          <CardTitle>Instance Details</CardTitle>
          <CardDescription>
            Configuration and status information
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Status (DB)</span>
            <Badge className={`${statusColors[instance.status]} text-white`}>
              {instance.status}
            </Badge>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Gateway URL</span>
            <span className="font-mono text-sm">{instance.gatewayUrl}</span>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Instance ID</span>
            <span className="font-mono text-sm">{instance.id}</span>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Created At</span>
            <span className="text-sm">
              {new Date(instance.createdAt).toLocaleString()}
            </span>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Last Updated</span>
            <span className="text-sm">
              {new Date(instance.updatedAt).toLocaleString()}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
