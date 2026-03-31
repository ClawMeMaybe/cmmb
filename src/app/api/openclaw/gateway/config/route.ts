import { NextRequest, NextResponse } from "next/server";

export interface GatewayConfigResponse {
  gatewayUrl: string;
  hasToken: boolean;
}

/**
 * GET /api/openclaw/gateway/config
 * Get current gateway configuration
 */
export async function GET(): Promise<NextResponse<GatewayConfigResponse>> {
  const gatewayUrl =
    process.env.OPENCLAW_GATEWAY_URL || "http://localhost:18789";
  const gatewayToken = process.env.OPENCLAW_GATEWAY_TOKEN;

  return NextResponse.json({
    gatewayUrl,
    hasToken: !!gatewayToken,
  });
}

export interface GatewayConfigUpdate {
  gatewayUrl?: string;
  gatewayToken?: string;
}

export interface GatewayTestResponse {
  success: boolean;
  message: string;
  details?: {
    version?: string;
    uptime?: number;
  };
}

/**
 * PUT /api/openclaw/gateway/config
 * Test gateway connection with provided configuration
 */
export async function PUT(
  request: NextRequest
): Promise<NextResponse<GatewayTestResponse>> {
  try {
    const body: GatewayConfigUpdate = await request.json();
    const testUrl =
      body.gatewayUrl ||
      process.env.OPENCLAW_GATEWAY_URL ||
      "http://localhost:18789";
    const testToken = body.gatewayToken || process.env.OPENCLAW_GATEWAY_TOKEN;

    if (!testToken) {
      return NextResponse.json({
        success: false,
        message: "No gateway token provided",
      });
    }

    const response = await fetch(`${testUrl}/health`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${testToken}`,
      },
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    if (!response.ok) {
      return NextResponse.json({
        success: false,
        message:
          response.status === 401
            ? "Authentication failed - check your token"
            : `Gateway returned status ${response.status}`,
      });
    }

    const data = await response.json();

    return NextResponse.json({
      success: true,
      message: "Connection successful",
      details: {
        version: data.version,
        uptime: data.uptime,
      },
    });
  } catch (error) {
    console.error("[GatewayConfig] Test failed:", error);

    if (error instanceof TypeError && error.message.includes("fetch")) {
      return NextResponse.json({
        success: false,
        message: "Could not connect to gateway - check the URL",
      });
    }

    return NextResponse.json({
      success: false,
      message:
        error instanceof Error ? error.message : "Connection test failed",
    });
  }
}
