/**
 * Log-related TypeScript types for the real-time logs viewer
 */

/** Log level enum matching common logging conventions */
export type LogLevel = "error" | "warn" | "info" | "debug";

/** Log source indicating where the log originated */
export type LogSource = "gateway" | "agent";

/** Log entry structure for both API and streaming */
export interface LogEntry {
  id: string;
  timestamp: Date;
  level: LogLevel;
  source: LogSource;
  instanceId?: string;
  message: string;
  metadata?: Record<string, unknown>;
}

/** Log entry as received from API (dates as strings) */
export interface LogEntryResponse {
  id: string;
  timestamp: string;
  level: LogLevel;
  source: LogSource;
  instanceId?: string;
  message: string;
  metadata?: Record<string, unknown>;
}

/** Query parameters for logs REST API */
export interface LogsQueryParams {
  instanceId?: string;
  level?: LogLevel;
  source?: LogSource;
  search?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
}

/** Pagination metadata for logs response */
export interface LogsPagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

/** Response from logs REST API */
export interface LogsApiResponse {
  logs: LogEntryResponse[];
  pagination: LogsPagination;
}

/** WebSocket/SSE message types */
export type LogStreamMessageType =
  | "log"
  | "batch"
  | "error"
  | "connected"
  | "search_result";

/** Client-to-server stream messages */
export interface LogStreamSubscribeMessage {
  type: "subscribe";
  instanceId?: string;
  level?: LogLevel[];
  source?: LogSource;
}

export interface LogStreamUnsubscribeMessage {
  type: "unsubscribe";
}

export interface LogStreamSearchMessage {
  type: "search";
  query: string;
}

export type LogStreamClientMessage =
  | LogStreamSubscribeMessage
  | LogStreamUnsubscribeMessage
  | LogStreamSearchMessage;

/** Server-to-client stream messages */
export interface LogStreamLogMessage {
  type: "log";
  payload: LogEntryResponse;
}

export interface LogStreamBatchMessage {
  type: "batch";
  payload: LogEntryResponse[];
}

export interface LogStreamErrorMessage {
  type: "error";
  message: string;
}

export interface LogStreamConnectedMessage {
  type: "connected";
  message: string;
}

export interface LogStreamSearchResultMessage {
  type: "search_result";
  query: string;
  results: LogEntryResponse[];
}

export type LogStreamServerMessage =
  | LogStreamLogMessage
  | LogStreamBatchMessage
  | LogStreamErrorMessage
  | LogStreamConnectedMessage
  | LogStreamSearchResultMessage;

/** Filter state for the logs viewer */
export interface LogFilterState {
  levels: LogLevel[];
  source?: LogSource;
  instanceId?: string;
}

/** Export format options */
export type LogExportFormat = "json" | "csv" | "txt";

/** Export options for log download */
export interface LogExportOptions {
  format: LogExportFormat;
  includeMetadata: boolean;
  dateRange?: {
    start: string;
    end: string;
  };
}

/** Connection state for streaming */
export type LogStreamConnectionState =
  | "connecting"
  | "connected"
  | "disconnected"
  | "error";

/** Hook return type for log streaming */
export interface UseLogStreamReturn {
  logs: LogEntry[];
  connectionState: LogStreamConnectionState;
  error: string | null;
  subscribe: (options: {
    instanceId?: string;
    level?: LogLevel[];
    source?: LogSource;
  }) => void;
  unsubscribe: () => void;
  search: (query: string) => void;
  clearLogs: () => void;
}

/** Color mapping for log levels */
export const LOG_LEVEL_COLORS: Record<LogLevel, string> = {
  error: "bg-red-500 text-white",
  warn: "bg-yellow-500 text-black",
  info: "bg-blue-500 text-white",
  debug: "bg-gray-500 text-white",
};

/** Label mapping for log sources */
export const LOG_SOURCE_LABELS: Record<LogSource, string> = {
  gateway: "Gateway",
  agent: "Agent",
};

/** Default log levels for filtering */
export const DEFAULT_LOG_LEVELS: LogLevel[] = ["error", "warn", "info"];

/** Max logs to keep in memory for streaming */
export const MAX_STREAM_LOGS = 1000;

/** Default page size for REST API */
export const DEFAULT_PAGE_SIZE = 100;

/** Max page size for REST API */
export const MAX_PAGE_SIZE = 500;
