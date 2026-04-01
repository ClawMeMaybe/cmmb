"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Play, Pause, Trash2, Activity } from "lucide-react";
import { LogsViewer } from "@/components/logs/logs-viewer";
import { LogFilter } from "@/components/logs/log-filter";
import { LogSearch } from "@/components/logs/log-search";
import { LogExportDialog } from "@/components/logs/log-export-dialog";
import { useLogStream } from "@/hooks/useLogStream";
import type { Instance } from "@/types";
import type { LogEntry, LogFilterState, LogEntryResponse } from "@/types/logs";
import { DEFAULT_LOG_LEVELS } from "@/types/logs";

export default function LogsPage() {
  // State for instances list
  const [instances, setInstances] = useState<Instance[]>([]);
  const [instancesLoading, setInstancesLoading] = useState(true);

  // Log stream hook
  const {
    logs,
    connectionState,
    error: streamError,
    subscribe,
    unsubscribe,
    clearLogs,
  } = useLogStream();

  // Filter state
  const [filterState, setFilterState] = useState<LogFilterState>({
    levels: DEFAULT_LOG_LEVELS,
  });

  // Search state
  const [searchTerm, setSearchTerm] = useState("");

  // Auto-scroll toggle
  const [autoScroll, setAutoScroll] = useState(true);

  // Streaming active state
  const [isStreaming, setIsStreaming] = useState(false);

  // Fetch instances on mount
  useEffect(() => {
    async function fetchInstances() {
      try {
        const response = await fetch("/api/instances");
        if (!response.ok) throw new Error("Failed to fetch instances");
        const data = await response.json();
        setInstances(data.data || []);
      } catch (err) {
        console.error("Failed to fetch instances:", err);
      } finally {
        setInstancesLoading(false);
      }
    }

    fetchInstances();
  }, []);

  // Handle streaming toggle
  const handleStreamToggle = useCallback(() => {
    if (isStreaming) {
      unsubscribe();
      setIsStreaming(false);
    } else {
      subscribe({
        instanceId: filterState.instanceId,
        level: filterState.levels,
        source: filterState.source,
      });
      setIsStreaming(true);
    }
  }, [isStreaming, filterState, subscribe, unsubscribe]);

  // Handle filter change - reconnect if streaming
  const handleFilterChange = useCallback(
    (newState: LogFilterState) => {
      setFilterState(newState);
      if (isStreaming) {
        unsubscribe();
        subscribe({
          instanceId: newState.instanceId,
          level: newState.levels,
          source: newState.source,
        });
      }
    },
    [isStreaming, subscribe, unsubscribe]
  );

  // Filter logs by level and source (client-side)
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      if (!filterState.levels.includes(log.level)) return false;
      if (filterState.source && log.source !== filterState.source) return false;
      if (filterState.instanceId && log.instanceId !== filterState.instanceId)
        return false;
      return true;
    });
  }, [logs, filterState]);

  // Convert LogEntry to LogEntryResponse for export
  const logsForExport: LogEntryResponse[] = useMemo(
    () =>
      filteredLogs.map((log) => ({
        ...log,
        timestamp:
          typeof log.timestamp === "string"
            ? log.timestamp
            : log.timestamp.toISOString(),
      })),
    [filteredLogs]
  );

  // Connection status indicator
  const connectionStatus = useMemo(() => {
    switch (connectionState) {
      case "connecting":
        return (
          <Badge variant="outline" className="bg-yellow-100 text-yellow-800">
            Connecting...
          </Badge>
        );
      case "connected":
        return (
          <Badge variant="outline" className="bg-green-100 text-green-800">
            Connected
          </Badge>
        );
      case "disconnected":
        return (
          <Badge variant="outline" className="bg-gray-100 text-gray-800">
            Disconnected
          </Badge>
        );
      case "error":
        return (
          <Badge variant="outline" className="bg-red-100 text-red-800">
            Error
          </Badge>
        );
      default:
        return null;
    }
  }, [connectionState]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Logs</h1>
          <p className="text-muted-foreground">
            Real-time log streaming from OpenClaw instances
          </p>
        </div>
        <div className="flex items-center gap-4">
          {connectionStatus}
          <LogExportDialog logs={logsForExport} disabled={logs.length === 0} />
        </div>
      </div>

      {/* Stream Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Stream Controls
          </CardTitle>
          <CardDescription>
            Connect to OpenClaw instances for real-time log streaming
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-center">
            {/* Stream Toggle Button */}
            <Button
              variant={isStreaming ? "destructive" : "default"}
              onClick={handleStreamToggle}
              disabled={instancesLoading || instances.length === 0}
            >
              {isStreaming ? (
                <>
                  <Pause className="h-4 w-4 mr-2" />
                  Stop Stream
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Start Stream
                </>
              )}
            </Button>

            {/* Clear Logs Button */}
            <Button
              variant="outline"
              onClick={clearLogs}
              disabled={logs.length === 0}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Clear Logs
            </Button>

            {/* Auto-scroll Toggle */}
            <div className="flex items-center gap-2">
              <Switch
                id="auto-scroll"
                checked={autoScroll}
                onCheckedChange={setAutoScroll}
              />
              <Label htmlFor="auto-scroll" className="cursor-pointer">
                Auto-scroll
              </Label>
            </div>

            {/* Log count */}
            <span className="text-muted-foreground text-sm">
              {filteredLogs.length} logs
            </span>
          </div>

          {/* Error display */}
          {streamError && (
            <div className="mt-4 p-3 bg-destructive/10 text-destructive rounded-md">
              {streamError}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Filters and Search */}
      <div className="flex flex-wrap gap-4 items-center justify-between">
        <LogFilter
          filterState={filterState}
          onFilterChange={handleFilterChange}
          instances={instances.map((i) => ({ id: i.id, name: i.name }))}
        />
        <LogSearch onSearch={setSearchTerm} />
      </div>

      {/* Logs Tabs */}
      <Tabs defaultValue="stream" className="w-full">
        <TabsList>
          <TabsTrigger value="stream">Live Stream</TabsTrigger>
          <TabsTrigger value="historical">Historical</TabsTrigger>
        </TabsList>

        <TabsContent value="stream">
          <LogsViewer
            logs={filteredLogs}
            searchTerm={searchTerm}
            autoScroll={autoScroll}
            maxHeight="calc(100vh - 400px)"
          />
        </TabsContent>

        <TabsContent value="historical">
          <HistoricalLogsViewer
            filterState={filterState}
            searchTerm={searchTerm}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/**
 * Historical logs viewer component for fetching paginated logs
 */
function HistoricalLogsViewer({
  filterState,
  searchTerm,
}: {
  filterState: LogFilterState;
  searchTerm: string;
}) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 100,
    total: 0,
    totalPages: 0,
  });

  const fetchLogs = useCallback(
    async (page: number) => {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams();
        if (filterState.instanceId) {
          params.set("instanceId", filterState.instanceId);
        }
        if (filterState.levels.length === 1) {
          params.set("level", filterState.levels[0]);
        }
        if (filterState.source) {
          params.set("source", filterState.source);
        }
        if (searchTerm) {
          params.set("search", searchTerm);
        }
        params.set("page", String(page));
        params.set("pageSize", String(pagination.pageSize));

        const response = await fetch(`/api/logs?${params.toString()}`);
        if (!response.ok) throw new Error("Failed to fetch logs");

        const data = await response.json();
        const logEntries = data.data.logs.map(
          (log: import("@/types/logs").LogEntryResponse): LogEntry => ({
            ...log,
            timestamp: new Date(log.timestamp),
          })
        );

        setLogs(logEntries);
        setPagination(data.data.pagination);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    },
    [filterState, searchTerm, pagination.pageSize]
  );

  useEffect(() => {
    fetchLogs(1);
  }, [fetchLogs]);

  return (
    <div className="space-y-4">
      {/* Loading and Error States */}
      {loading && (
        <div className="text-center py-4 text-muted-foreground">
          Loading logs...
        </div>
      )}
      {error && (
        <div className="p-3 bg-destructive/10 text-destructive rounded-md">
          {error}
        </div>
      )}

      {/* Logs Display */}
      {!loading && !error && (
        <LogsViewer
          logs={logs}
          searchTerm={searchTerm}
          autoScroll={false}
          maxHeight="calc(100vh - 450px)"
        />
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={pagination.page === 1 || loading}
            onClick={() => fetchLogs(pagination.page - 1)}
          >
            Previous
          </Button>
          <span className="text-muted-foreground py-2">
            Page {pagination.page} of {pagination.totalPages} (
            {pagination.total} total)
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={pagination.page === pagination.totalPages || loading}
            onClick={() => fetchLogs(pagination.page + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
