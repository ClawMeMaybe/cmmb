import { NextResponse } from "next/server";
import type { HealthCheckResponse } from "@/types";

export async function GET(): Promise<NextResponse<HealthCheckResponse>> {
  return NextResponse.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version ?? "0.1.0",
  });
}
