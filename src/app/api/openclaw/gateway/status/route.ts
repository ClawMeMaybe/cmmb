import { NextResponse } from "next/server";
import { createProxyConfig } from "@/lib/openclaw-proxy";

export interface GatewayStatusResponse {
  status: "ok" | "error" | "offline";
  version?: string;
  uptime?: number;
  gatewayUrl?: string;
}

/**
 * GET /api/openclaw/gateway/status
 * Fetch health status from OpenClaw Gateway
 */
export async function GET(): Promise<NextResponse<GatewayStatusResponse>> {
  const config = createProxyConfig();

  if (!config) {
    return NextResponse.json(
      {
        status: "offline",
        gatewayUrl:
          process.env.OPENCLAW_GATEWAY_URL || "http://localhost:18789",
      },
      { status: 200 }
    );
  }

  try {
    const response = await fetch(`${config.gatewayUrl}/health`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${config.gatewayToken}`,
      },
      signal: AbortSignal.timeout(5000), // 5 second timeout
    });

    if (!response.ok) {
      return NextResponse.json(
        {
          status: "error",
          gatewayUrl: config.gatewayUrl,
        },
        { status: 200 }
      );
    }

    const data = await response.json();

    return NextResponse.json({
      status: "ok",
      version: data.version,
      uptime: data.uptime,
      gatewayUrl: config.gatewayUrl,
    });
  } catch (error) {
    console.error("[GatewayStatus] Error fetching health:", error);

    return NextResponse.json(
      {
        status: "offline",
        gatewayUrl: config.gatewayUrl,
      },
      { status: 200 }
    );
  }
}
