import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getAlerts, createAlert, getActiveAlertsCount } from "@/server/alerts";
import { AlertSeverity, AlertStatus } from "@prisma/client";
import type { ApiResponse, Alert } from "@/types";

export async function GET(request: NextRequest): Promise<
  NextResponse<
    ApiResponse<{
      alerts: Alert[];
      pagination: {
        page: number;
        pageSize: number;
        total: number;
        totalPages: number;
      };
      activeCount: number;
    }>
  >
> {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") as AlertStatus | null;
    const severity = searchParams.get("severity") as AlertSeverity | null;
    const instanceId = searchParams.get("instanceId");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "20", 10);

    const alertsData = await getAlerts({
      status: status ?? undefined,
      severity: severity ?? undefined,
      instanceId: instanceId ?? undefined,
      page,
      pageSize,
    });

    const activeCount = await getActiveAlertsCount(instanceId ?? undefined);

    return NextResponse.json({
      data: {
        alerts: alertsData.alerts as Alert[],
        pagination: alertsData.pagination,
        activeCount,
      },
    });
  } catch (error) {
    console.error("Get alerts error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest
): Promise<NextResponse<ApiResponse<Alert>>> {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only admins can create manual alerts
    if (session.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Only admins can create alerts" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { title, message, severity, source, instanceId, metadata } = body;

    if (!title || !message) {
      return NextResponse.json(
        { error: "Title and message are required" },
        { status: 400 }
      );
    }

    const alert = await createAlert({
      title,
      message,
      severity: severity as AlertSeverity | undefined,
      source,
      instanceId,
      metadata,
    });

    return NextResponse.json(
      { data: alert as Alert, message: "Alert created successfully" },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create alert error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
