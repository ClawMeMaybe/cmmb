import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { acknowledgeAlert } from "@/server/alerts";
import type { ApiResponse, Alert } from "@/types";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<ApiResponse<Alert>>> {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const note = body.note as string | undefined;

    const alert = await acknowledgeAlert(id, session.id, note);

    if (!alert) {
      return NextResponse.json({ error: "Alert not found" }, { status: 404 });
    }

    return NextResponse.json({
      data: alert,
      message: "Alert acknowledged successfully",
    });
  } catch (error) {
    console.error("Acknowledge alert error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
