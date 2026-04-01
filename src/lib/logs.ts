/**
 * OpenClaw Gateway log fetching client
 * Provides methods to fetch and stream logs from the Gateway
 */

import type {
  LogLevel,
  LogSource,
  LogEntry,
  LogEntryResponse,
  LogsQueryParams,
  LogsApiResponse,
} from "@/types/logs";
import { GatewayClient } from "./gateway";

/** Gateway log entry structure (as received from Gateway) */
interface GatewayLogEntry {
  id?: string;
  timestamp: string | number;
  level: string;
  source?: string;
  instance?: string;
  message: string;
  metadata?: Record<string, unknown>;
}

/**
 * Parse a log level string to valid LogLevel type
 */
function parseLogLevel(level: string): LogLevel {
  const normalized = level.toLowerCase();
  if (
    normalized === "error" ||
    normalized === "err" ||
    normalized === "fatal"
  ) {
    return "error";
  }
  if (normalized === "warn" || normalized === "warning") {
    return "warn";
  }
  if (normalized === "info" || normalized === "information") {
    return "info";
  }
  return "debug";
}

/**
 * Parse a log source string to valid LogSource type
 */
function parseLogSource(source: string | undefined): LogSource {
  if (!source) return "gateway";
  const normalized = source.toLowerCase();
  if (normalized === "agent" || normalized === "bot") return "agent";
  return "gateway";
}

/**
 * Generate a unique ID for a log entry
 */
function generateLogId(): string {
  return `log-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Convert a Gateway log entry to our LogEntry format
 */
function convertGatewayLog(log: GatewayLogEntry): LogEntryResponse {
  return {
    id: log.id ?? generateLogId(),
    timestamp:
      typeof log.timestamp === "number"
        ? new Date(log.timestamp).toISOString()
        : log.timestamp,
    level: parseLogLevel(log.level),
    source: parseLogSource(log.source),
    instanceId: log.instance,
    message: log.message,
    metadata: log.metadata,
  };
}

/**
 * Log client extending Gateway client with log-specific methods
 */
export class LogClient extends GatewayClient {
  /**
   * Fetch historical logs from the Gateway
   */
  async getLogs(params: LogsQueryParams = {}): Promise<LogsApiResponse> {
    const queryParams = new URLSearchParams();

    if (params.instanceId) queryParams.set("instance", params.instanceId);
    if (params.level) queryParams.set("level", params.level);
    if (params.source) queryParams.set("source", params.source);
    if (params.search) queryParams.set("search", params.search);
    if (params.startDate) queryParams.set("start", params.startDate);
    if (params.endDate) queryParams.set("end", params.endDate);
    if (params.page) queryParams.set("page", String(params.page));
    if (params.pageSize) queryParams.set("size", String(params.pageSize));

    const endpoint = `/api/logs${queryParams.toString() ? `?${queryParams.toString()}` : ""}`;
    const response = await this.request<
      | GatewayLogEntry[]
      | {
          logs: GatewayLogEntry[];
          pagination?: { page: number; size: number; total: number };
        }
    >(endpoint);

    if (!response.success || !response.data) {
      // Return empty response on error - logs may not be available on Gateway
      return {
        logs: [],
        pagination: {
          page: params.page ?? 1,
          pageSize: params.pageSize ?? 100,
          total: 0,
          totalPages: 0,
        },
      };
    }

    // Handle both array and wrapped response formats
    let rawLogs: GatewayLogEntry[];
    let pagination = {
      page: params.page ?? 1,
      pageSize: params.pageSize ?? 100,
      total: 0,
      totalPages: 0,
    };

    if (Array.isArray(response.data)) {
      rawLogs = response.data;
      pagination.total = rawLogs.length;
      pagination.totalPages = 1;
    } else {
      rawLogs = response.data.logs ?? [];
      if (response.data.pagination) {
        pagination = {
          page: response.data.pagination.page ?? pagination.page,
          pageSize: response.data.pagination.size ?? pagination.pageSize,
          total: response.data.pagination.total ?? rawLogs.length,
          totalPages: Math.ceil(
            (response.data.pagination.total ?? rawLogs.length) /
              (response.data.pagination.size ?? 100)
          ),
        };
      }
    }

    const logs = rawLogs.map(convertGatewayLog);

    return { logs, pagination };
  }

  /**
   * Stream logs via SSE from the Gateway
   * Returns a function to close the connection
   */
  streamLogs(
    onLog: (log: LogEntryResponse) => void,
    onError?: (error: Error) => void,
    params: {
      instanceId?: string;
      level?: LogLevel[];
      source?: LogSource;
    } = {}
  ): () => void {
    const queryParams = new URLSearchParams();

    if (params.instanceId) queryParams.set("instance", params.instanceId);
    if (params.level?.length) queryParams.set("level", params.level.join(","));
    if (params.source) queryParams.set("source", params.source);

    const url = `${this.baseUrl}/api/logs/stream${queryParams.toString() ? `?${queryParams.toString()}` : ""}`;

    // Use fetch with ReadableStream for SSE-style streaming
    let controller: AbortController | null = null;

    const connect = async () => {
      controller = new AbortController();

      try {
        const response = await fetch(url, {
          headers: {
            Authorization: `Bearer ${this.token}`,
            Accept: "text/event-stream",
          },
          signal: controller.signal,
        });

        if (!response.ok) {
          onError?.(
            new Error(`Failed to connect to log stream: ${response.status}`)
          );
          return;
        }

        const reader = response.body?.getReader();
        if (!reader) {
          onError?.(new Error("No response body"));
          return;
        }

        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // Process SSE events
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.substring(6));
                if (data.type === "log" && data.payload) {
                  onLog(convertGatewayLog(data.payload));
                } else if (data.log) {
                  // Handle direct log format
                  onLog(convertGatewayLog(data.log));
                }
              } catch {
                // Skip malformed JSON
              }
            }
          }
        }
      } catch (error) {
        if (error instanceof Error && error.name !== "AbortError") {
          onError?.(error);
        }
      }
    };

    connect();

    // Return cleanup function
    return () => {
      controller?.abort();
    };
  }

  /**
   * Search logs by text query
   */
  async searchLogs(
    query: string,
    params: LogsQueryParams = {}
  ): Promise<LogEntryResponse[]> {
    const result = await this.getLogs({ ...params, search: query });
    return result.logs;
  }
}

/**
 * Create a Log client for a specific instance
 */
export function createLogClient(gatewayUrl: string, token: string): LogClient {
  return new LogClient(gatewayUrl, token);
}

/**
 * Format a log entry for display
 */
export function formatLogMessage(log: LogEntry | LogEntryResponse): string {
  const timestamp =
    typeof log.timestamp === "string"
      ? log.timestamp
      : log.timestamp.toISOString();
  const level = log.level.toUpperCase().padEnd(5);
  const source = log.source.toUpperCase().padEnd(7);
  const instance = log.instanceId ? `[${log.instanceId}]` : "";
  return `${timestamp} | ${level} | ${source} ${instance} | ${log.message}`;
}

/**
 * Export logs to various formats
 */
export function exportLogs(
  logs: LogEntryResponse[],
  format: "json" | "csv" | "txt",
  includeMetadata: boolean = false
): string {
  if (format === "json") {
    return JSON.stringify(
      includeMetadata ? logs : logs.map((l) => ({ ...l, metadata: undefined })),
      null,
      2
    );
  }

  if (format === "csv") {
    const headers = includeMetadata
      ? "timestamp,level,source,instanceId,message,metadata"
      : "timestamp,level,source,instanceId,message";
    const rows = logs.map((log) => {
      const base = `${log.timestamp},${log.level},${log.source},${log.instanceId ?? ""},"${log.message.replace(/"/g, '\\"')}"`;
      if (includeMetadata) {
        return `${base},"${JSON.stringify(log.metadata ?? {}).replace(/"/g, '\\"')}"`;
      }
      return base;
    });
    return `${headers}\n${rows.join("\n")}`;
  }

  // txt format
  return logs.map(formatLogMessage).join("\n");
}
