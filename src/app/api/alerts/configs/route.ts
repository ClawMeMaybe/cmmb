import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getAlertConfigs, createAlertConfig } from "@/server/alerts";
import type { ApiResponse, AlertConfig, AlertConfigInput } from "@/types";

export async function GET(): Promise<NextResponse<ApiResponse<AlertConfig[]>>> {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const configs = await getAlertConfigs();
    return NextResponse.json({ data: configs });
  } catch (error) {
    console.error("Get alert configs error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest
): Promise<NextResponse<ApiResponse<AlertConfig>>> {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body: AlertConfigInput = await request.json();

    if (
      !body.name ||
      !body.metricType ||
      !body.operator ||
      body.threshold === undefined
    ) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: name, metricType, operator, threshold",
        },
        { status: 400 }
      );
    }

    const validOperators = [">", ">=", "<", "<=", "==", "!="];
    if (!validOperators.includes(body.operator)) {
      return NextResponse.json(
        {
          error: `Invalid operator. Must be one of: ${validOperators.join(", ")}`,
        },
        { status: 400 }
      );
    }

    const config = await createAlertConfig(body);
    return NextResponse.json({
      data: config,
      message: "Alert configuration created successfully",
    });
  } catch (error) {
    console.error("Create alert config error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
