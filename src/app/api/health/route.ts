import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { HealthCheckResponse, HealthCheckDetail } from "@/types";

/**
 * @openapi
 * /health:
 *   get:
 *     summary: Health check
 *     description: Check system health including database connectivity
 *     tags:
 *       - System
 *     security: []
 *     responses:
 *       '200':
 *         description: System is healthy
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HealthCheckResponse'
 *       '503':
 *         description: System is unhealthy
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HealthCheckResponse'
 */

/**
 * Health check endpoint for deployment validation
 * Checks database connectivity and optionally gateway connectivity
 */
export async function GET(): Promise<NextResponse<HealthCheckResponse>> {
  const checks: HealthCheckDetail["checks"] = {
    database: { status: "pending" },
  };

  // Check database connectivity
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = { status: "ok" };
  } catch (error) {
    checks.database = {
      status: "error",
      message:
        error instanceof Error ? error.message : "Database connection failed",
    };
  }

  // Determine overall status
  const allHealthy = Object.values(checks).every(
    (check) => check.status === "ok"
  );
  const overallStatus = allHealthy ? "ok" : "error";

  // Include gateway check if configured (optional, non-blocking)
  const gatewayToken = process.env.OPENCLAW_GATEWAY_TOKEN;
  if (gatewayToken) {
    // Gateway check is informational only, doesn't affect health status
    // This is because the app should still be healthy even if gateway is down
    checks.gateway = {
      status: "skipped",
      message: "Gateway check available via /api/health/gateway",
    };
  }

  return NextResponse.json(
    {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version ?? "0.1.0",
      checks,
    },
    {
      status: allHealthy ? 200 : 503,
    }
  );
}
