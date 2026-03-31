/**
 * OpenClaw Gateway API Proxy Route
 * Forwards all requests from /api/openclaw/* to OpenClaw Gateway
 */

import {
  createProxyConfig,
  proxyRequest,
  createErrorResponse,
  PROXY_ERROR_CODES,
} from "@/lib/openclaw-proxy";

/**
 * Handle GET requests
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> }
): Promise<Response> {
  return handleProxy(request, params);
}

/**
 * Handle POST requests
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> }
): Promise<Response> {
  return handleProxy(request, params);
}

/**
 * Handle PUT requests
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> }
): Promise<Response> {
  return handleProxy(request, params);
}

/**
 * Handle PATCH requests
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> }
): Promise<Response> {
  return handleProxy(request, params);
}

/**
 * Handle DELETE requests
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> }
): Promise<Response> {
  return handleProxy(request, params);
}

/**
 * Handle HEAD requests
 */
export async function HEAD(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> }
): Promise<Response> {
  return handleProxy(request, params);
}

/**
 * Handle OPTIONS requests (CORS preflight)
 */
export async function OPTIONS(): Promise<Response> {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods":
        "GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}

/**
 * Common proxy handler for all HTTP methods
 */
async function handleProxy(
  request: Request,
  params: Promise<{ path: string[] }>
): Promise<Response> {
  // Await params as required by Next.js 15+
  const { path } = await params;

  // Log the proxy request
  console.log(
    `[OpenClawProxy] ${request.method} /api/openclaw/${path.join("/")}`
  );

  // Check if proxy is configured
  const config = createProxyConfig();
  if (!config) {
    return createErrorResponse(
      "OpenClaw Gateway proxy not configured. Set OPENCLAW_GATEWAY_TOKEN environment variable.",
      503,
      PROXY_ERROR_CODES.NOT_CONFIGURED
    );
  }

  // Proxy the request
  return proxyRequest(request, config);
}
