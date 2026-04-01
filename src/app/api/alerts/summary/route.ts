import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getAlertSummary } from "@/server/alerts";
import type { ApiResponse, AlertSummary } from "@/types";

export async function GET(): Promise<NextResponse<ApiResponse<AlertSummary>>> {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const summary = await getAlertSummary();
    return NextResponse.json({ data: summary });
  } catch (error) {
    console.error("Get alert summary error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
