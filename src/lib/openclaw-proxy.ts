/**
 * OpenClaw Gateway API Proxy
 * Forwards requests from /api/openclaw/* to OpenClaw Gateway
 */

/**
 * Configuration for the OpenClaw Gateway proxy
 */
export interface ProxyConfig {
  /** Gateway base URL (e.g., http://localhost:18789) */
  gatewayUrl: string;
  /** Authentication token for Gateway API */
  gatewayToken: string;
  /** Request timeout in milliseconds (default: 30000) */
  timeout?: number;
}

/**
 * Default timeout for proxy requests (30 seconds)
 */
export const DEFAULT_PROXY_TIMEOUT = 30000;

/**
 * Create a proxy configuration from environment variables
 */
export function createProxyConfig(): ProxyConfig | null {
  const gatewayUrl =
    process.env.OPENCLAW_GATEWAY_URL || "http://localhost:18789";
  const gatewayToken = process.env.OPENCLAW_GATEWAY_TOKEN;

  if (!gatewayToken) {
    console.warn("[OpenClawProxy] OPENCLAW_GATEWAY_TOKEN not configured");
    return null;
  }

  return {
    gatewayUrl,
    gatewayToken,
    timeout: DEFAULT_PROXY_TIMEOUT,
  };
}

/**
 * Build the target URL for a proxy request
 */
export function buildTargetUrl(
  gatewayUrl: string,
  path: string,
  searchParams?: URLSearchParams
): string {
  // Remove leading slash from path if present
  const normalizedPath = path.startsWith("/") ? path.slice(1) : path;

  // Build base URL
  const url = `${gatewayUrl.replace(/\/$/, "")}/${normalizedPath}`;

  // Append query parameters if present
  if (searchParams && searchParams.size > 0) {
    return `${url}?${searchParams.toString()}`;
  }

  return url;
}

/**
 * Headers to forward from the incoming request to the gateway
 */
const FORWARD_HEADERS = [
  "content-type",
  "accept",
  "accept-encoding",
  "accept-language",
  "user-agent",
];

/**
 * Headers to exclude from forwarding
 */
const EXCLUDED_HEADERS = [
  "host",
  "authorization", // We add our own auth header
  "cookie",
  "content-length", // Let fetch handle this
];

/**
 * Build headers for the proxy request
 */
export function buildProxyHeaders(
  incomingHeaders: Headers,
  gatewayToken: string
): Headers {
  const proxyHeaders = new Headers();

  // Add authorization header for Gateway
  proxyHeaders.set("Authorization", `Bearer ${gatewayToken}`);

  // Forward selected headers from incoming request
  incomingHeaders.forEach((value, key) => {
    const lowerKey = key.toLowerCase();
    if (
      FORWARD_HEADERS.includes(lowerKey) &&
      !EXCLUDED_HEADERS.includes(lowerKey)
    ) {
      proxyHeaders.set(key, value);
    }
  });

  return proxyHeaders;
}

/**
 * Create an AbortController with timeout
 */
export function createTimeoutController(timeout: number): {
  controller: AbortController;
  timeoutId: NodeJS.Timeout;
} {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort(new Error("Request timeout"));
  }, timeout);

  return { controller, timeoutId };
}

/**
 * Proxy error response types
 */
export interface ProxyErrorResponse {
  error: string;
  message?: string;
  code: string;
}

/**
 * Create a JSON error response
 */
export function createErrorResponse(
  message: string,
  status: number,
  code: string
): Response {
  const error: ProxyErrorResponse = {
    error: message,
    code,
  };
  return Response.json(error, { status });
}

/**
 * Error codes for proxy responses
 */
export const PROXY_ERROR_CODES = {
  NOT_CONFIGURED: "PROXY_NOT_CONFIGURED",
  TIMEOUT: "PROXY_TIMEOUT",
  CONNECTION_ERROR: "PROXY_CONNECTION_ERROR",
  INTERNAL_ERROR: "PROXY_INTERNAL_ERROR",
} as const;

/**
 * Proxy a request to the OpenClaw Gateway
 */
export async function proxyRequest(
  request: Request,
  config: ProxyConfig
): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname.replace("/api/openclaw", "");

  const targetUrl = buildTargetUrl(config.gatewayUrl, path, url.searchParams);
  const headers = buildProxyHeaders(request.headers, config.gatewayToken);

  const { controller, timeoutId } = createTimeoutController(
    config.timeout ?? DEFAULT_PROXY_TIMEOUT
  );

  try {
    const response = await fetch(targetUrl, {
      method: request.method,
      headers,
      body: request.body,
      signal: controller.signal,
      // @ts-expect-error - duplex is needed for streaming requests
      duplex: "half",
    });

    clearTimeout(timeoutId);

    // Stream the response back
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof Error) {
      if (error.name === "AbortError" || error.message === "Request timeout") {
        return createErrorResponse(
          "Gateway request timed out",
          504,
          PROXY_ERROR_CODES.TIMEOUT
        );
      }

      return createErrorResponse(
        `Gateway connection failed: ${error.message}`,
        502,
        PROXY_ERROR_CODES.CONNECTION_ERROR
      );
    }

    return createErrorResponse(
      "Internal proxy error",
      500,
      PROXY_ERROR_CODES.INTERNAL_ERROR
    );
  }
}
