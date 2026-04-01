import { NextResponse } from "next/server";

export async function GET() {
  try {
    const response = await fetch("http://localhost:18789/health", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      return NextResponse.json({
        data: {
          status: "error",
          message: `Gateway returned ${response.status}`,
        },
      });
    }

    const health = await response.json();
    return NextResponse.json({
      data: {
        status: "ok",
        version: health.version || "unknown",
        uptime: health.uptime || 0,
      },
    });
  } catch {
    return NextResponse.json({
      data: {
        status: "offline",
        message: "Gateway not reachable",
      },
    });
  }
}
