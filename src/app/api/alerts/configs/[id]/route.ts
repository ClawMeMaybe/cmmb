import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  getAlertConfigById,
  updateAlertConfig,
  deleteAlertConfig,
} from "@/server/alerts";
import type { ApiResponse, AlertConfig, AlertConfigUpdateInput } from "@/types";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(
  _request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<ApiResponse<AlertConfig>>> {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const config = await getAlertConfigById(id);

    if (!config) {
      return NextResponse.json(
        { error: "Alert configuration not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: config });
  } catch (error) {
    console.error("Get alert config error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<ApiResponse<AlertConfig>>> {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body: AlertConfigUpdateInput = await request.json();

    if (body.operator) {
      const validOperators = [">", ">=", "<", "<=", "==", "!="];
      if (!validOperators.includes(body.operator)) {
        return NextResponse.json(
          {
            error: `Invalid operator. Must be one of: ${validOperators.join(", ")}`,
          },
          { status: 400 }
        );
      }
    }

    const config = await updateAlertConfig(id, body);

    if (!config) {
      return NextResponse.json(
        { error: "Alert configuration not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      data: config,
      message: "Alert configuration updated successfully",
    });
  } catch (error) {
    console.error("Update alert config error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<ApiResponse<null>>> {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    await deleteAlertConfig(id);

    return NextResponse.json({
      message: "Alert configuration deleted successfully",
    });
  } catch (error) {
    console.error("Delete alert config error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
