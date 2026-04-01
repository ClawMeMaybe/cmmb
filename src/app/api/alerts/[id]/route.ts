import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getAlertById, updateAlert, deleteAlert } from "@/server/alerts";
import type { ApiResponse, Alert } from "@/types";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<Alert>>> {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const alert = await getAlertById(id);

    if (!alert) {
      return NextResponse.json({ error: "Alert not found" }, { status: 404 });
    }

    return NextResponse.json({ data: alert as Alert });
  } catch (error) {
    console.error("Get alert error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<Alert>>> {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { status, acknowledgedById } = body;

    // If acknowledging, use the current user's ID
    const ackById = acknowledgedById === true ? session.id : acknowledgedById;

    const alert = await updateAlert(id, {
      status,
      acknowledgedById: ackById,
    });

    return NextResponse.json({
      data: alert as Alert,
      message: "Alert updated successfully",
    });
  } catch (error) {
    console.error("Update alert error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<Alert>>> {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only admins can delete alerts
    if (session.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Only admins can delete alerts" },
        { status: 403 }
      );
    }

    const { id } = await params;

    const alert = await deleteAlert(id);

    return NextResponse.json({
      data: alert as Alert,
      message: "Alert deleted successfully",
    });
  } catch (error) {
    console.error("Delete alert error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
