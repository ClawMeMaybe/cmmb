import swaggerJSDoc from "swagger-jsdoc";

const options: swaggerJSDoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "ClawMeMaybe API",
      version: "1.0.0",
      description:
        "API documentation for ClawMeMaybe - AI-native enterprise-level OpenClaw management platform",
      contact: {
        name: "ClawMeMaybe Team",
      },
    },
    servers: [
      {
        url: "/api",
        description: "API Server",
      },
    ],
    components: {
      securitySchemes: {
        cookieAuth: {
          type: "apiKey",
          in: "cookie",
          name: "session_token",
          description: "Session token stored in cookie",
        },
      },
      schemas: {
        // Common response wrapper
        ApiResponse: {
          type: "object",
          properties: {
            data: {
              description: "Response data",
            },
            error: {
              type: "string",
              description: "Error message if request failed",
            },
            message: {
              type: "string",
              description: "Success or info message",
            },
          },
        },
        // User schemas
        User: {
          type: "object",
          properties: {
            id: {
              type: "string",
              description: "User ID",
            },
            email: {
              type: "string",
              format: "email",
              description: "User email",
            },
            name: {
              type: "string",
              nullable: true,
              description: "User display name",
            },
            role: {
              type: "string",
              enum: ["ADMIN", "VIEWER"],
              description: "User role",
            },
            createdAt: {
              type: "string",
              format: "date-time",
              description: "Creation timestamp",
            },
            updatedAt: {
              type: "string",
              format: "date-time",
              description: "Last update timestamp",
            },
          },
        },
        LoginRequest: {
          type: "object",
          required: ["email", "password"],
          properties: {
            email: {
              type: "string",
              format: "email",
              description: "User email",
            },
            password: {
              type: "string",
              format: "password",
              description: "User password",
            },
            rememberMe: {
              type: "boolean",
              description: "Extend session duration",
            },
          },
        },
        LoginResponse: {
          type: "object",
          properties: {
            user: {
              $ref: "#/components/schemas/User",
            },
            sessionExpiresAt: {
              type: "string",
              format: "date-time",
              description: "Session expiration timestamp",
            },
          },
        },
        // Instance schemas
        Instance: {
          type: "object",
          properties: {
            id: {
              type: "string",
              description: "Instance ID",
            },
            name: {
              type: "string",
              description: "Instance name",
            },
            description: {
              type: "string",
              nullable: true,
              description: "Instance description",
            },
            status: {
              type: "string",
              enum: ["ONLINE", "OFFLINE", "STARTING", "STOPPING", "ERROR"],
              description: "Instance status",
            },
            gatewayUrl: {
              type: "string",
              format: "uri",
              description: "Gateway URL",
            },
            createdAt: {
              type: "string",
              format: "date-time",
              description: "Creation timestamp",
            },
            updatedAt: {
              type: "string",
              format: "date-time",
              description: "Last update timestamp",
            },
            createdById: {
              type: "string",
              description: "Creator user ID",
            },
          },
        },
        CreateInstanceRequest: {
          type: "object",
          required: ["name", "gatewayUrl", "token"],
          properties: {
            name: {
              type: "string",
              description: "Instance name",
            },
            description: {
              type: "string",
              description: "Instance description",
            },
            gatewayUrl: {
              type: "string",
              format: "uri",
              description: "Gateway URL",
            },
            token: {
              type: "string",
              description: "Authentication token",
            },
          },
        },
        UpdateInstanceRequest: {
          type: "object",
          properties: {
            name: {
              type: "string",
              description: "Instance name",
            },
            description: {
              type: "string",
              description: "Instance description",
            },
            gatewayUrl: {
              type: "string",
              format: "uri",
              description: "Gateway URL",
            },
            token: {
              type: "string",
              description: "Authentication token",
            },
          },
        },
        InstanceActionRequest: {
          type: "object",
          required: ["action"],
          properties: {
            action: {
              type: "string",
              enum: ["start", "stop", "restart"],
              description: "Action to perform",
            },
          },
        },
        InstanceMetrics: {
          type: "object",
          properties: {
            cpu: {
              type: "number",
              description: "CPU usage percentage",
            },
            memory: {
              type: "number",
              description: "Memory usage percentage",
            },
            requestCount: {
              type: "integer",
              description: "Total request count",
            },
            status: {
              type: "string",
              description: "Instance status",
            },
            timestamp: {
              type: "string",
              format: "date-time",
              description: "Metrics timestamp",
            },
          },
        },
        // Channel schemas
        Channel: {
          type: "object",
          properties: {
            id: {
              type: "string",
              description: "Channel ID",
            },
            name: {
              type: "string",
              description: "Channel name",
            },
            type: {
              type: "string",
              enum: [
                "WHATSAPP",
                "TELEGRAM",
                "DISCORD",
                "SIGNAL",
                "WECHAT",
                "WEIBO",
                "DINGTALK",
                "FEISHU",
                "WECOM",
                "QQBOT",
                "SLACK",
                "OTHER",
              ],
              description: "Channel type",
            },
            status: {
              type: "string",
              enum: ["ONLINE", "OFFLINE", "ERROR", "CONFIGURING"],
              description: "Channel status",
            },
            enabled: {
              type: "boolean",
              description: "Channel enabled status",
            },
            accountId: {
              type: "string",
              nullable: true,
              description: "Account ID",
            },
            lastInbound: {
              type: "string",
              format: "date-time",
              nullable: true,
              description: "Last inbound message timestamp",
            },
            lastOutbound: {
              type: "string",
              format: "date-time",
              nullable: true,
              description: "Last outbound message timestamp",
            },
            createdAt: {
              type: "string",
              format: "date-time",
              description: "Creation timestamp",
            },
            updatedAt: {
              type: "string",
              format: "date-time",
              description: "Last update timestamp",
            },
          },
        },
        CreateChannelRequest: {
          type: "object",
          required: ["name", "type"],
          properties: {
            name: {
              type: "string",
              description: "Channel name",
            },
            type: {
              type: "string",
              enum: [
                "WHATSAPP",
                "TELEGRAM",
                "DISCORD",
                "SIGNAL",
                "WECHAT",
                "WEIBO",
                "DINGTALK",
                "FEISHU",
                "WECOM",
                "QQBOT",
                "SLACK",
                "OTHER",
              ],
              description: "Channel type",
            },
            accountId: {
              type: "string",
              description: "Account ID",
            },
            config: {
              type: "object",
              description: "Channel configuration",
            },
            enabled: {
              type: "boolean",
              description: "Channel enabled status",
            },
          },
        },
        UpdateChannelRequest: {
          type: "object",
          properties: {
            name: {
              type: "string",
              description: "Channel name",
            },
            type: {
              type: "string",
              enum: [
                "WHATSAPP",
                "TELEGRAM",
                "DISCORD",
                "SIGNAL",
                "WECHAT",
                "WEIBO",
                "DINGTALK",
                "FEISHU",
                "WECOM",
                "QQBOT",
                "SLACK",
                "OTHER",
              ],
              description: "Channel type",
            },
            accountId: {
              type: "string",
              description: "Account ID",
            },
            config: {
              type: "object",
              description: "Channel configuration",
            },
            enabled: {
              type: "boolean",
              description: "Channel enabled status",
            },
          },
        },
        // Audit Log schemas
        AuditLog: {
          type: "object",
          properties: {
            id: {
              type: "string",
              description: "Audit log ID",
            },
            action: {
              type: "string",
              description: "Action performed",
            },
            entityType: {
              type: "string",
              description: "Entity type",
            },
            entityId: {
              type: "string",
              description: "Entity ID",
            },
            details: {
              type: "object",
              description: "Action details",
            },
            createdAt: {
              type: "string",
              format: "date-time",
              description: "Creation timestamp",
            },
            userId: {
              type: "string",
              description: "User ID who performed action",
            },
          },
        },
        // Session schemas
        Session: {
          type: "object",
          properties: {
            id: {
              type: "string",
              description: "Session ID",
            },
            userAgent: {
              type: "string",
              nullable: true,
              description: "User agent string",
            },
            ipAddress: {
              type: "string",
              nullable: true,
              description: "IP address",
            },
            expiresAt: {
              type: "string",
              format: "date-time",
              description: "Session expiration timestamp",
            },
            createdAt: {
              type: "string",
              format: "date-time",
              description: "Creation timestamp",
            },
            lastAccessed: {
              type: "string",
              format: "date-time",
              description: "Last access timestamp",
            },
          },
        },
        // Gateway schemas
        GatewayStatus: {
          type: "object",
          properties: {
            status: {
              type: "string",
              enum: ["ok", "error", "offline"],
              description: "Gateway status",
            },
            version: {
              type: "string",
              description: "Gateway version",
            },
            uptime: {
              type: "number",
              description: "Gateway uptime in seconds",
            },
            gatewayUrl: {
              type: "string",
              description: "Gateway URL",
            },
          },
        },
        GatewayConfig: {
          type: "object",
          properties: {
            gatewayUrl: {
              type: "string",
              format: "uri",
              description: "Gateway URL",
            },
            hasToken: {
              type: "boolean",
              description: "Whether token is configured",
            },
          },
        },
        // Health check schemas
        HealthCheckResponse: {
          type: "object",
          properties: {
            status: {
              type: "string",
              enum: ["ok", "error"],
              description: "Overall health status",
            },
            timestamp: {
              type: "string",
              format: "date-time",
              description: "Check timestamp",
            },
            version: {
              type: "string",
              description: "Application version",
            },
            checks: {
              type: "object",
              properties: {
                database: {
                  type: "object",
                  properties: {
                    status: {
                      type: "string",
                      enum: ["ok", "error", "pending", "skipped"],
                    },
                    message: {
                      type: "string",
                    },
                  },
                },
                gateway: {
                  type: "object",
                  properties: {
                    status: {
                      type: "string",
                      enum: ["ok", "error", "pending", "skipped"],
                    },
                    message: {
                      type: "string",
                    },
                  },
                },
              },
            },
          },
        },
        // Skill schemas
        Skill: {
          type: "object",
          properties: {
            name: {
              type: "string",
              description: "Skill name",
            },
            description: {
              type: "string",
              nullable: true,
              description: "Skill description",
            },
            location: {
              type: "string",
              description: "Skill location",
            },
            enabled: {
              type: "boolean",
              description: "Whether skill is enabled",
            },
            content: {
              type: "string",
              nullable: true,
              description: "Skill content",
            },
          },
        },
        // Device schemas
        PairedDevice: {
          type: "object",
          properties: {
            id: {
              type: "string",
              description: "Device ID",
            },
            name: {
              type: "string",
              description: "Device name",
            },
            type: {
              type: "string",
              description: "Device type",
            },
            lastActive: {
              type: "string",
              format: "date-time",
              description: "Last active timestamp",
            },
          },
        },
        // Dashboard metrics
        DashboardMetrics: {
          type: "object",
          properties: {
            instanceCount: {
              type: "integer",
              description: "Total instance count",
            },
            onlineInstances: {
              type: "integer",
              description: "Online instance count",
            },
            channelCount: {
              type: "integer",
              description: "Total channel count",
            },
            activeChannels: {
              type: "integer",
              description: "Active channel count",
            },
            messageCount24h: {
              type: "integer",
              description: "Messages in last 24 hours",
            },
            errorCount24h: {
              type: "integer",
              description: "Errors in last 24 hours",
            },
          },
        },
        // Error response
        ErrorResponse: {
          type: "object",
          properties: {
            error: {
              type: "string",
              description: "Error message",
            },
          },
        },
      },
    },
    security: [
      {
        cookieAuth: [],
      },
    ],
  },
  apis: ["./src/app/api/**/*.ts", "./src/server/**/*.ts", "./src/lib/**/*.ts"],
};

export function generateOpenApiSpec() {
  return swaggerJSDoc(options);
}
