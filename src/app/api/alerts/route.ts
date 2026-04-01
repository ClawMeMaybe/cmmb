import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getAlerts, createAlert } from "@/server/alerts";
import type {
  ApiResponse,
  AlertWithRelations,
  Alert,
  AlertCreateInput,
  AlertFilterOptions,
} from "@/types";

export async function GET(
  request: NextRequest
): Promise<NextResponse<ApiResponse<AlertWithRelations[]>>> {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const options: AlertFilterOptions = {
      status: searchParams.get("status") as AlertFilterOptions["status"],
      severity: searchParams.get("severity") as AlertFilterOptions["severity"],
      instanceId: searchParams.get("instanceId") ?? undefined,
      configId: searchParams.get("configId") ?? undefined,
      limit: searchParams.get("limit")
        ? parseInt(searchParams.get("limit")!, 10)
        : 50,
      offset: searchParams.get("offset")
        ? parseInt(searchParams.get("offset")!, 10)
        : 0,
    };

    const alerts = await getAlerts(options);
    return NextResponse.json({ data: alerts });
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

    const body: AlertCreateInput = await request.json();

    if (!body.title || !body.message || !body.metricType) {
      return NextResponse.json(
        { error: "Missing required fields: title, message, metricType" },
        { status: 400 }
      );
    }

    const alert = await createAlert(body);
    return NextResponse.json({
      data: alert,
      message: "Alert created successfully",
    });
  } catch (error) {
    console.error("Create alert error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
