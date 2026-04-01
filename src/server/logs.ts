/**
 * Server-side log functions
 * Handles fetching logs from instances via their Gateway
 */

import { prisma } from "@/lib/prisma";
import { createLogClient } from "@/lib/logs";
import type {
  LogsApiResponse,
  LogsQueryParams,
  LogEntryResponse,
  LogLevel,
  LogSource,
} from "@/types/logs";
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from "@/types/logs";

/**
 * Get logs from all instances or a specific instance
 */
export async function getLogs(
  params: LogsQueryParams = {}
): Promise<LogsApiResponse> {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, params.pageSize ?? DEFAULT_PAGE_SIZE)
  );

  // If specific instance, get logs from that instance's Gateway
  if (params.instanceId) {
    const instance = await prisma.instance.findUnique({
      where: { id: params.instanceId },
    });

    if (!instance) {
      return {
        logs: [],
        pagination: { page, pageSize, total: 0, totalPages: 0 },
      };
    }

    try {
      const logClient = createLogClient(instance.gatewayUrl, instance.token);
      return await logClient.getLogs({ ...params, page, pageSize });
    } catch (error) {
      console.error("Failed to fetch logs from instance:", error);
      return {
        logs: [],
        pagination: { page, pageSize, total: 0, totalPages: 0 },
      };
    }
  }

  // If no specific instance, fetch from all instances
  const instances = await prisma.instance.findMany({
    where: { status: "ONLINE" },
    orderBy: { createdAt: "desc" },
  });

  if (instances.length === 0) {
    return {
      logs: [],
      pagination: { page, pageSize, total: 0, totalPages: 0 },
    };
  }

  // Fetch logs from each instance concurrently
  const logPromises = instances.map(async (instance) => {
    try {
      const logClient = createLogClient(instance.gatewayUrl, instance.token);
      const result = await logClient.getLogs({ ...params, page, pageSize });
      return result.logs;
    } catch {
      return [];
    }
  });

  const logResults = await Promise.all(logPromises);

  // Combine and sort logs by timestamp
  const allLogs = logResults.flat().sort((a, b) => {
    const timeA = new Date(a.timestamp).getTime();
    const timeB = new Date(b.timestamp).getTime();
    return timeB - timeA; // Most recent first
  });

  // Apply pagination to combined results
  const startIndex = (page - 1) * pageSize;
  const paginatedLogs = allLogs.slice(startIndex, startIndex + pageSize);
  const total = allLogs.length;
  const totalPages = Math.ceil(total / pageSize);

  return {
    logs: paginatedLogs,
    pagination: { page, pageSize, total, totalPages },
  };
}

/**
 * Get logs from a specific instance by ID
 */
export async function getInstanceLogs(
  instanceId: string,
  params: LogsQueryParams = {}
): Promise<LogsApiResponse> {
  return getLogs({ ...params, instanceId });
}

/**
 * Create a log stream connection for an instance
 * Returns cleanup function
 */
export async function createInstanceLogStream(
  instanceId: string,
  onLog: (log: LogEntryResponse) => void,
  onError?: (error: Error) => void,
  params?: {
    level?: LogLevel[];
    source?: LogSource;
  }
): Promise<() => void> {
  const instance = await prisma.instance.findUnique({
    where: { id: instanceId },
  });

  if (!instance) {
    onError?.(new Error("Instance not found"));
    return () => {};
  }

  const logClient = createLogClient(instance.gatewayUrl, instance.token);
  return logClient.streamLogs(onLog, onError, params);
}
