import { NextResponse } from "next/server";
import { clearSession } from "@/lib/auth";
import type { ApiResponse } from "@/types";

export async function POST(): Promise<NextResponse<ApiResponse<null>>> {
  try {
    await clearSession();

    return NextResponse.json({
      message: "Logged out successfully",
    });
  } catch (error) {
    console.error("Logout error:", error);
    return NextResponse.json({ error: "Failed to logout" }, { status: 500 });
  }
}
