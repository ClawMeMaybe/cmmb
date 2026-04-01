import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createLogClient } from "@/lib/logs";
import type { LogEntryResponse, LogLevel, LogSource } from "@/types/logs";

export async function GET(request: NextRequest): Promise<Response> {
  const session = await getSession();

  if (!session) {
    return new Response(
      JSON.stringify({ type: "error", message: "Unauthorized" }),
      {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  const searchParams = request.nextUrl.searchParams;
  const instanceId = searchParams.get("instanceId");
  const levelParam = searchParams.get("level");
  const sourceParam = searchParams.get("source");

  // Parse level filter
  const levels: LogLevel[] | undefined = levelParam
    ? (levelParam
        .split(",")
        .filter((l) =>
          ["error", "warn", "info", "debug"].includes(l)
        ) as LogLevel[])
    : undefined;

  // Parse source filter
  const source: LogSource | undefined =
    sourceParam && ["gateway", "agent"].includes(sourceParam)
      ? (sourceParam as LogSource)
      : undefined;

  // Create SSE stream
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      // Send connected message
      const connectedMessage = {
        type: "connected",
        message: "Log stream connected",
      };
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify(connectedMessage)}\n\n`)
      );

      // Get instances to stream from
      let instances: { id: string; gatewayUrl: string; token: string }[] = [];

      if (instanceId) {
        const instance = await prisma.instance.findUnique({
          where: { id: instanceId },
          select: { id: true, gatewayUrl: true, token: true },
        });
        if (instance) {
          instances = [instance];
        }
      } else {
        instances = await prisma.instance.findMany({
          where: { status: "ONLINE" },
          select: { id: true, gatewayUrl: true, token: true },
          orderBy: { createdAt: "desc" },
        });
      }

      if (instances.length === 0) {
        const errorMessage = {
          type: "error",
          message: "No instances available for streaming",
        };
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(errorMessage)}\n\n`)
        );
        controller.close();
        return;
      }

      // Create cleanup functions array
      const cleanupFunctions: (() => void)[] = [];

      // Set up streaming for each instance
      for (const instance of instances) {
        const logClient = createLogClient(instance.gatewayUrl, instance.token);

        const cleanup = logClient.streamLogs(
          (log: LogEntryResponse) => {
            // Apply filters
            if (levels && !levels.includes(log.level)) return;
            if (source && log.source !== source) return;

            // Add instance ID if not present
            if (!log.instanceId) {
              log.instanceId = instance.id;
            }

            const message = { type: "log", payload: log };
            try {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify(message)}\n\n`)
              );
            } catch {
              // Stream closed, ignore
            }
          },
          (error: Error) => {
            const errorMessage = {
              type: "error",
              message: `Stream error for instance ${instance.id}: ${error.message}`,
            };
            try {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify(errorMessage)}\n\n`)
              );
            } catch {
              // Stream closed, ignore
            }
          },
          { level: levels, source }
        );

        cleanupFunctions.push(cleanup);
      }

      // Handle cleanup when stream is closed
      // Note: In Next.js App Router, we can't easily detect client disconnect
      // The stream will be garbage collected when the client disconnects
    },
    cancel() {
      // This is called when the client disconnects
      // Cleanup would happen here if we stored cleanup functions
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
