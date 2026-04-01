import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { ApiResponse } from "@/types";

export interface MetricDataPoint {
  timestamp: string;
  cpu: number;
  memory: number;
  requestCount: number;
}

export interface MetricsHistoryResponse {
  metrics: MetricDataPoint[];
  timeRange: string;
  totalRequests: number;
  avgCpu: number;
  avgMemory: number;
}

type TimeRange = "24h" | "7d" | "30d";

/**
 * @openapi
 * /dashboard/metrics:
 *   get:
 *     summary: Get dashboard metrics history
 *     description: Retrieve aggregated metrics history for dashboard charts
 *     tags:
 *       - Dashboard
 *     parameters:
 *       - name: range
 *         in: query
 *         description: Time range for metrics
 *         schema:
 *           type: string
 *           enum: ["24h", "7d", "30d"]
 *           default: "24h"
 *     responses:
 *       '200':
 *         description: Metrics history data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     metrics:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           timestamp:
 *                             type: string
 *                             format: date-time
 *                           cpu:
 *                             type: number
 *                           memory:
 *                             type: number
 *                           requestCount:
 *                             type: integer
 *                     timeRange:
 *                       type: string
 *                     totalRequests:
 *                       type: integer
 *                     avgCpu:
 *                       type: number
 *                     avgMemory:
 *                       type: number
 *       '401':
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       '500':
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

function getTimeRangeFilter(timeRange: TimeRange): Date {
  const now = new Date();
  switch (timeRange) {
    case "24h":
      return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    case "7d":
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case "30d":
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    default:
      return new Date(now.getTime() - 24 * 60 * 60 * 1000);
  }
}

function getAggregationInterval(timeRange: TimeRange): number {
  // Number of minutes to aggregate by
  switch (timeRange) {
    case "24h":
      return 30; // 30-minute intervals
    case "7d":
      return 180; // 3-hour intervals
    case "30d":
      return 720; // 12-hour intervals
    default:
      return 30;
  }
}

export async function GET(
  request: NextRequest
): Promise<NextResponse<ApiResponse<MetricsHistoryResponse>>> {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const timeRange = (searchParams.get("range") as TimeRange) || "24h";

    const startTime = getTimeRangeFilter(timeRange);
    const intervalMinutes = getAggregationInterval(timeRange);

    // Fetch all metric history records within the time range
    const metrics = await prisma.metricHistory.findMany({
      where: {
        createdAt: {
          gte: startTime,
        },
      },
      orderBy: {
        createdAt: "asc",
      },
      select: {
        cpu: true,
        memory: true,
        requestCount: true,
        createdAt: true,
        instanceId: true,
      },
    });

    // If no metrics found, return simulated data for demo
    if (metrics.length === 0) {
      const simulatedMetrics = generateSimulatedMetrics(timeRange);
      return NextResponse.json({
        data: {
          metrics: simulatedMetrics,
          timeRange,
          totalRequests: Math.floor(Math.random() * 50000),
          avgCpu: 25 + Math.random() * 15,
          avgMemory: 40 + Math.random() * 20,
        },
      });
    }

    // Aggregate metrics by interval
    const aggregatedMetrics: MetricDataPoint[] = [];
    const intervalMs = intervalMinutes * 60 * 1000;

    // Group metrics by time intervals
    const groupedMetrics: Record<
      string,
      { cpu: number[]; memory: number[]; requestCount: number[] }
    > = {};

    for (const metric of metrics) {
      const intervalKey = new Date(
        Math.floor(metric.createdAt.getTime() / intervalMs) * intervalMs
      ).toISOString();

      if (!groupedMetrics[intervalKey]) {
        groupedMetrics[intervalKey] = { cpu: [], memory: [], requestCount: [] };
      }

      if (metric.cpu !== null) groupedMetrics[intervalKey].cpu.push(metric.cpu);
      if (metric.memory !== null)
        groupedMetrics[intervalKey].memory.push(metric.memory);
      if (metric.requestCount !== null)
        groupedMetrics[intervalKey].requestCount.push(metric.requestCount);
    }

    // Calculate averages for each interval
    for (const [timestamp, values] of Object.entries(groupedMetrics)) {
      aggregatedMetrics.push({
        timestamp,
        cpu:
          values.cpu.length > 0
            ? values.cpu.reduce((a, b) => a + b, 0) / values.cpu.length
            : 0,
        memory:
          values.memory.length > 0
            ? values.memory.reduce((a, b) => a + b, 0) / values.memory.length
            : 0,
        requestCount:
          values.requestCount.length > 0
            ? Math.max(...values.requestCount) // Use max for request count
            : 0,
      });
    }

    // Calculate totals and averages
    const totalRequests = Math.max(
      ...metrics.map((m) => m.requestCount ?? 0),
      0
    );
    const avgCpu =
      metrics
        .filter((m) => m.cpu !== null)
        .reduce((sum, m) => sum + (m.cpu ?? 0), 0) /
        metrics.filter((m) => m.cpu !== null).length || 0;
    const avgMemory =
      metrics
        .filter((m) => m.memory !== null)
        .reduce((sum, m) => sum + (m.memory ?? 0), 0) /
        metrics.filter((m) => m.memory !== null).length || 0;

    return NextResponse.json({
      data: {
        metrics: aggregatedMetrics,
        timeRange,
        totalRequests,
        avgCpu,
        avgMemory,
      },
    });
  } catch (error) {
    console.error("Get metrics history error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

function generateSimulatedMetrics(timeRange: TimeRange): MetricDataPoint[] {
  const now = new Date();
  const points: MetricDataPoint[] = [];
  let numPoints: number;
  let intervalMs: number;

  switch (timeRange) {
    case "24h":
      numPoints = 48; // 30-minute intervals
      intervalMs = 30 * 60 * 1000;
      break;
    case "7d":
      numPoints = 56; // 3-hour intervals
      intervalMs = 3 * 60 * 60 * 1000;
      break;
    case "30d":
      numPoints = 60; // 12-hour intervals
      intervalMs = 12 * 60 * 60 * 1000;
      break;
    default:
      numPoints = 48;
      intervalMs = 30 * 60 * 1000;
  }

  // Generate base values with some variance
  const baseCpu = 20 + Math.random() * 15;
  const baseMemory = 35 + Math.random() * 20;
  const baseRequests = 1000 + Math.random() * 5000;

  for (let i = numPoints - 1; i >= 0; i--) {
    const timestamp = new Date(now.getTime() - i * intervalMs);
    const variance = Math.sin(i / 10) * 10 + Math.random() * 5;
    const cpu = Math.max(0, Math.min(100, baseCpu + variance));
    const memory = Math.max(0, Math.min(100, baseMemory + variance * 0.5));
    const requestCount = Math.floor(
      baseRequests + (numPoints - i) * 50 + Math.random() * 100
    );

    points.push({
      timestamp: timestamp.toISOString(),
      cpu: Math.round(cpu * 10) / 10,
      memory: Math.round(memory * 10) / 10,
      requestCount,
    });
  }

  return points;
}
