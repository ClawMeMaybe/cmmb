"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Activity,
  CheckCircle,
  XCircle,
  RefreshCw,
  Clock,
  Server,
} from "lucide-react";

interface GatewayHealth {
  status: "ok" | "error" | "offline";
  version?: string;
  uptime?: number;
}

interface GatewayStatusProps {
  showDetails?: boolean;
  onStatusChange?: (status: GatewayHealth) => void;
}

export function GatewayStatus({
  showDetails = false,
  onStatusChange,
}: GatewayStatusProps) {
  const [health, setHealth] = useState<GatewayHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchHealth = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      try {
        const res = await fetch("/api/openclaw/gateway/status");
        if (res.ok) {
          const data = await res.json();
          setHealth(data);
          onStatusChange?.(data);
        } else {
          setHealth({ status: "error" });
          onStatusChange?.({ status: "error" });
        }
      } catch {
        setHealth({ status: "offline" });
        onStatusChange?.({ status: "offline" });
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [onStatusChange]
  );

  useEffect(() => {
    fetchHealth();
    // Refresh every 30 seconds
    const interval = setInterval(() => fetchHealth(), 30000);
    return () => clearInterval(interval);
  }, [fetchHealth]);

  const formatUptime = (seconds: number): string => {
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
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const isConnected = health?.status === "ok";

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            OpenClaw Gateway
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => fetchHealth(true)}
            disabled={refreshing}
            className="h-6 w-6"
          >
            <RefreshCw
              className={`h-3 w-3 ${refreshing ? "animate-spin" : ""}`}
            />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            {isConnected ? (
              <CheckCircle className="h-5 w-5 text-green-500" />
            ) : (
              <XCircle className="h-5 w-5 text-red-500" />
            )}
            <div>
              <p
                className={`font-medium ${isConnected ? "text-green-500" : "text-red-500"}`}
              >
                {isConnected ? "Connected" : "Disconnected"}
              </p>
              <p className="text-xs text-muted-foreground">
                {isConnected ? "Gateway is running" : "Gateway not reachable"}
              </p>
            </div>
          </div>

          {showDetails && health && (
            <div className="grid gap-2 text-sm pt-2 border-t">
              {health.version && (
                <div className="flex items-center gap-2">
                  <Server className="h-3 w-3 text-muted-foreground" />
                  <span className="text-muted-foreground">Version:</span>
                  <span className="font-mono">{health.version}</span>
                </div>
              )}
              {health.uptime !== undefined && (
                <div className="flex items-center gap-2">
                  <Clock className="h-3 w-3 text-muted-foreground" />
                  <span className="text-muted-foreground">Uptime:</span>
                  <span>{formatUptime(health.uptime)}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
