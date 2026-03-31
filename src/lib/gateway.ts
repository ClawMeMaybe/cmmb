/**
 * OpenClaw Gateway API client
 * Used to communicate with OpenClaw instances for lifecycle management
 */

export type InstanceAction = "start" | "stop" | "restart";

export interface GatewayResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface GatewayHealthResponse {
  status: "ok" | "error";
  version?: string;
  uptime?: number;
}

export interface GatewayInstanceStatus {
  status: string;
  uptime?: number;
  lastSeen?: string;
}

/**
 * Client for interacting with OpenClaw Gateway API
 */
export class GatewayClient {
  private baseUrl: string;
  private token: string;

  constructor(gatewayUrl: string, token: string) {
    this.baseUrl = gatewayUrl.replace(/\/$/, ""); // Remove trailing slash
    this.token = token;
  }

  /**
   * Make an authenticated request to the Gateway API
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<GatewayResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          Authorization: `Bearer ${this.token}`,
          "Content-Type": "application/json",
          ...options.headers,
        },
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        return {
          success: false,
          error: data.error || data.message || `HTTP ${response.status}`,
        };
      }

      return {
        success: true,
        data,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to connect to gateway",
      };
    }
  }

  /**
   * Check gateway health status
   */
  async health(): Promise<GatewayResponse<GatewayHealthResponse>> {
    return this.request<GatewayHealthResponse>("/health");
  }

  /**
   * Start the OpenClaw instance
   */
  async start(): Promise<GatewayResponse> {
    return this.request("/api/instance/start", {
      method: "POST",
    });
  }

  /**
   * Stop the OpenClaw instance
   */
  async stop(): Promise<GatewayResponse> {
    return this.request("/api/instance/stop", {
      method: "POST",
    });
  }

  /**
   * Restart the OpenClaw instance
   */
  async restart(): Promise<GatewayResponse> {
    return this.request("/api/instance/restart", {
      method: "POST",
    });
  }

  /**
   * Get instance status from gateway
   */
  async status(): Promise<GatewayResponse<GatewayInstanceStatus>> {
    return this.request<GatewayInstanceStatus>("/api/instance/status");
  }

  /**
   * Execute an action on the instance
   */
  async executeAction(action: InstanceAction): Promise<GatewayResponse> {
    switch (action) {
      case "start":
        return this.start();
      case "stop":
        return this.stop();
      case "restart":
        return this.restart();
      default:
        return {
          success: false,
          error: `Unknown action: ${action}`,
        };
    }
  }
}

/**
 * Create a Gateway client from environment configuration
 */
export function createGatewayClient(
  gatewayUrl: string,
  token: string
): GatewayClient {
  return new GatewayClient(gatewayUrl, token);
}
