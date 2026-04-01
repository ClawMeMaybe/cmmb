"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type {
  LogEntry,
  LogEntryResponse,
  LogLevel,
  LogSource,
  LogStreamConnectionState,
  LogStreamServerMessage,
  UseLogStreamReturn,
} from "@/types/logs";
import { MAX_STREAM_LOGS } from "@/types/logs";

/**
 * Convert a LogEntryResponse (from API) to LogEntry (with Date object)
 */
function parseLogEntry(log: LogEntryResponse): LogEntry {
  return {
    ...log,
    timestamp: new Date(log.timestamp),
  };
}

/**
 * Hook for streaming logs via SSE from the API
 */
export function useLogStream(): UseLogStreamReturn {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [connectionState, setConnectionState] =
    useState<LogStreamConnectionState>("disconnected");
  const [error, setError] = useState<string | null>(null);

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const currentParamsRef = useRef<{
    instanceId?: string;
    level?: LogLevel[];
    source?: LogSource;
  }>({});

  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  const search = useCallback(() => {
    // Search is handled by filtering the logs in memory
    // This is a placeholder for future server-side search
  }, []);

  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    setConnectionState("disconnected");
    reconnectAttemptsRef.current = 0;
  }, []);

  // Use a ref to hold the connect function to allow recursive calls
  const connectRef = useRef<
    | ((params: {
        instanceId?: string;
        level?: LogLevel[];
        source?: LogSource;
      }) => void)
    | null
  >(null);

  // Define the connect function
  useEffect(() => {
    connectRef.current = (params: {
      instanceId?: string;
      level?: LogLevel[];
      source?: LogSource;
    }) => {
      // Store params for potential reconnect
      currentParamsRef.current = params;

      // Close existing connection
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }

      setConnectionState("connecting");
      setError(null);

      // Build URL with query params
      const queryParams = new URLSearchParams();
      if (params.instanceId) {
        queryParams.set("instanceId", params.instanceId);
      }
      if (params.level?.length) {
        queryParams.set("level", params.level.join(","));
      }
      if (params.source) {
        queryParams.set("source", params.source);
      }

      const url = `/api/logs/stream${queryParams.toString() ? `?${queryParams.toString()}` : ""}`;

      const eventSource = new EventSource(url);
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        setConnectionState("connected");
        setError(null);
        reconnectAttemptsRef.current = 0;
      };

      eventSource.onmessage = (event) => {
        try {
          const message: LogStreamServerMessage = JSON.parse(event.data);

          if (message.type === "connected") {
            setConnectionState("connected");
          } else if (message.type === "log" && message.payload) {
            const newLog = parseLogEntry(message.payload);
            setLogs((prev) => {
              const updated = [...prev, newLog];
              if (updated.length > MAX_STREAM_LOGS) {
                return updated.slice(-MAX_STREAM_LOGS);
              }
              return updated;
            });
          } else if (message.type === "batch" && message.payload) {
            const newLogs = message.payload.map(parseLogEntry);
            setLogs((prev) => {
              const updated = [...prev, ...newLogs];
              if (updated.length > MAX_STREAM_LOGS) {
                return updated.slice(-MAX_STREAM_LOGS);
              }
              return updated;
            });
          } else if (message.type === "error") {
            setError(message.message);
          }
        } catch {
          // Skip malformed messages
        }
      };

      eventSource.onerror = () => {
        setConnectionState("error");

        // Auto-reconnect with exponential backoff
        const maxReconnectAttempts = 5;
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          const delay =
            Math.pow(2, reconnectAttemptsRef.current) * 1000 +
            Math.random() * 1000;
          reconnectAttemptsRef.current++;

          reconnectTimeoutRef.current = setTimeout(() => {
            // Use stored params for reconnect
            if (connectRef.current) {
              connectRef.current(currentParamsRef.current);
            }
          }, delay);
        } else {
          setError(
            "Connection failed after multiple attempts. Please refresh the page."
          );
        }
      };
    };

    // Cleanup on unmount
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, []);

  const subscribe = useCallback(
    (options: {
      instanceId?: string;
      level?: LogLevel[];
      source?: LogSource;
    }) => {
      if (connectRef.current) {
        connectRef.current(options);
      }
    },
    []
  );

  const unsubscribe = useCallback(() => {
    disconnect();
  }, [disconnect]);

  return {
    logs,
    connectionState,
    error,
    subscribe,
    unsubscribe,
    search,
    clearLogs,
  };
}
