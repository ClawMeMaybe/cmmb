"use client";

import { useEffect, useRef, useCallback, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import type { LogEntry } from "@/types/logs";
import { LOG_LEVEL_COLORS, LOG_SOURCE_LABELS } from "@/types/logs";

interface LogsViewerProps {
  logs: LogEntry[];
  searchTerm?: string;
  autoScroll?: boolean;
  maxHeight?: string;
}

/**
 * Format timestamp for display
 */
function formatTimestamp(date: Date): string {
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

/**
 * Highlight search term in text
 */
function highlightText(text: string, searchTerm: string): React.ReactNode {
  if (!searchTerm) return text;

  const lowerText = text.toLowerCase();
  const lowerSearch = searchTerm.toLowerCase();
  const index = lowerText.indexOf(lowerSearch);

  if (index === -1) return text;

  const before = text.slice(0, index);
  const match = text.slice(index, index + searchTerm.length);
  const after = text.slice(index + searchTerm.length);

  return (
    <>
      {before}
      <span className="bg-yellow-200 text-black font-semibold">{match}</span>
      {after}
    </>
  );
}

/**
 * Logs viewer component with virtual scrolling for large log volumes
 */
export function LogsViewer({
  logs,
  searchTerm = "",
  autoScroll = true,
  maxHeight = "600px",
}: LogsViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const shouldAutoScrollRef = useRef(autoScroll);

  // Update auto scroll preference
  useEffect(() => {
    shouldAutoScrollRef.current = autoScroll;
  }, [autoScroll]);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (shouldAutoScrollRef.current && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [logs]);

  // Filter logs by search term
  const filteredLogs = useMemo(() => {
    if (!searchTerm) return logs;

    const lowerSearch = searchTerm.toLowerCase();
    return logs.filter(
      (log) =>
        log.message.toLowerCase().includes(lowerSearch) ||
        log.level.toLowerCase().includes(lowerSearch) ||
        log.source.toLowerCase().includes(lowerSearch) ||
        (log.instanceId?.toLowerCase().includes(lowerSearch) ?? false) ||
        (log.metadata &&
          JSON.stringify(log.metadata).toLowerCase().includes(lowerSearch))
    );
  }, [logs, searchTerm]);

  // Scroll handler to detect manual scrolling
  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;

    // Disable auto-scroll when user scrolls up
    shouldAutoScrollRef.current = isNearBottom;
  }, []);

  if (logs.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-muted-foreground p-8 border rounded-lg"
        style={{ maxHeight }}
      >
        No logs to display. Connect to an instance to start streaming logs.
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="overflow-y-auto border rounded-lg bg-black/5 font-mono text-sm"
      style={{ maxHeight }}
      onScroll={handleScroll}
    >
      <div className="p-2">
        {filteredLogs.length === 0 && searchTerm && (
          <div className="text-muted-foreground text-center py-4">
            No logs matching &quot;{searchTerm}&quot;
          </div>
        )}
        {filteredLogs.map((log, index) => (
          <div
            key={`${log.id}-${index}`}
            className="flex gap-2 py-1 hover:bg-muted/50 px-1 rounded group"
          >
            {/* Timestamp */}
            <span className="text-muted-foreground shrink-0">
              {formatTimestamp(log.timestamp)}
            </span>

            {/* Level badge */}
            <Badge
              className={`${LOG_LEVEL_COLORS[log.level]} shrink-0 px-1 text-xs`}
            >
              {log.level.toUpperCase()}
            </Badge>

            {/* Source badge */}
            <Badge variant="outline" className="shrink-0 px-1 text-xs">
              {LOG_SOURCE_LABELS[log.source]}
            </Badge>

            {/* Instance ID (if present) */}
            {log.instanceId && (
              <span className="text-blue-500 shrink-0">
                [{log.instanceId.slice(0, 8)}]
              </span>
            )}

            {/* Message */}
            <span className="flex-1 whitespace-pre-wrap break-all">
              {highlightText(log.message, searchTerm)}
            </span>

            {/* Metadata indicator */}
            {log.metadata && Object.keys(log.metadata).length > 0 && (
              <span
                className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0 cursor-help"
                title={JSON.stringify(log.metadata, null, 2)}
              >
                [m]
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
