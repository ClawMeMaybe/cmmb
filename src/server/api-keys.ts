import { prisma } from "@/lib/prisma";
import type {
  ApiKey,
  ApiKeyUsage,
  ApiKeyCreateInput,
  ApiKeyUpdateInput,
  ApiKeyWithStats,
  ApiKeyUsageLog,
  ApiKeyUsageFilterOptions,
  ApiKeyFilterOptions,
  ApiKeyScope,
} from "@/types";

// All valid API key scopes
const ALL_SCOPES: ApiKeyScope[] = [
  "READ_INSTANCES",
  "WRITE_INSTANCES",
  "READ_CHANNELS",
  "WRITE_CHANNELS",
  "READ_ALERTS",
  "WRITE_ALERTS",
  "READ_LOGS",
  "READ_WORKSPACE",
  "WRITE_WORKSPACE",
  "ADMIN",
];

/**
 * Generate a secure API key
 */
function generateApiKey(): string {
  const prefix = "cmmb_";
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const key = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `${prefix}${key}`;
}

/**
 * Get all API keys for a user
 */
export async function getApiKeys(
  userId: string,
  options: ApiKeyFilterOptions = {}
): Promise<ApiKeyWithStats[]> {
  const {
    includeRevoked = false,
    expiredOnly = false,
    limit = 50,
    offset = 0,
  } = options;

  const now = new Date();

  const keys = await prisma.apiKey.findMany({
    where: {
      userId,
      revokedAt: includeRevoked ? undefined : null,
      expiresAt: expiredOnly ? { lt: now } : undefined,
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    skip: offset,
    include: {
      usages: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  // Get usage counts for each key
  const usageCounts = await Promise.all(
    keys.map(async (key) => {
      const count = await prisma.apiKeyUsage.count({
        where: { apiKeyId: key.id },
      });
      return { id: key.id, count };
    })
  );

  return keys.map((key) => ({
    id: key.id,
    key: key.key.substring(0, 12) + "...", // Masked key
    name: key.name,
    description: key.description,
    scopes: JSON.parse(key.scopes) as ApiKeyScope[],
    expiresAt: key.expiresAt,
    lastUsedAt: key.lastUsedAt,
    revokedAt: key.revokedAt,
    createdAt: key.createdAt,
    updatedAt: key.updatedAt,
    userId: key.userId,
    usageCount: usageCounts.find((u) => u.id === key.id)?.count ?? 0,
    lastUsage: key.usages[0]
      ? {
          endpoint: key.usages[0].endpoint,
          method: key.usages[0].method,
          statusCode: key.usages[0].statusCode,
          createdAt: key.usages[0].createdAt,
        }
      : null,
  }));
}

/**
 * Get a single API key by ID
 */
export async function getApiKeyById(
  id: string,
  userId: string
): Promise<ApiKeyWithStats | null> {
  const key = await prisma.apiKey.findFirst({
    where: { id, userId },
    include: {
      usages: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  if (!key) return null;

  const usageCount = await prisma.apiKeyUsage.count({
    where: { apiKeyId: key.id },
  });

  return {
    id: key.id,
    key: key.key.substring(0, 12) + "...", // Masked key
    name: key.name,
    description: key.description,
    scopes: JSON.parse(key.scopes) as ApiKeyScope[],
    expiresAt: key.expiresAt,
    lastUsedAt: key.lastUsedAt,
    revokedAt: key.revokedAt,
    createdAt: key.createdAt,
    updatedAt: key.updatedAt,
    userId: key.userId,
    usageCount,
    lastUsage: key.usages[0]
      ? {
          endpoint: key.usages[0].endpoint,
          method: key.usages[0].method,
          statusCode: key.usages[0].statusCode,
          createdAt: key.usages[0].createdAt,
        }
      : null,
  };
}

/**
 * Create a new API key
 */
export async function createApiKey(
  userId: string,
  data: ApiKeyCreateInput
): Promise<{
  id: string;
  key: string;
  name: string;
  description: string | null;
  scopes: ApiKeyScope[];
  expiresAt: Date | null;
  createdAt: Date;
}> {
  const fullKey = generateApiKey();

  // If ADMIN scope is present, include all scopes
  const scopes = data.scopes.includes("ADMIN") ? ALL_SCOPES : data.scopes;

  const apiKey = await prisma.apiKey.create({
    data: {
      key: fullKey,
      name: data.name,
      description: data.description,
      scopes: JSON.stringify(scopes),
      expiresAt: data.expiresAt,
      userId,
    },
  });

  // Create audit log
  await prisma.auditLog.create({
    data: {
      action: "CREATE_API_KEY",
      entityType: "ApiKey",
      entityId: apiKey.id,
      userId,
      details: { name: apiKey.name, scopes },
    },
  });

  return {
    id: apiKey.id,
    key: fullKey, // Return full key only on creation
    name: apiKey.name,
    description: apiKey.description,
    scopes,
    expiresAt: apiKey.expiresAt,
    createdAt: apiKey.createdAt,
  };
}

/**
 * Update an API key
 */
export async function updateApiKey(
  id: string,
  userId: string,
  data: ApiKeyUpdateInput
): Promise<ApiKey | null> {
  const existingKey = await prisma.apiKey.findFirst({
    where: { id, userId },
  });

  if (!existingKey) return null;

  // If ADMIN scope is present, include all scopes
  let scopes: ApiKeyScope[] | undefined = undefined;
  if (data.scopes) {
    scopes = data.scopes.includes("ADMIN") ? ALL_SCOPES : data.scopes;
  }

  const apiKey = await prisma.apiKey.update({
    where: { id },
    data: {
      name: data.name,
      description: data.description,
      scopes: scopes ? JSON.stringify(scopes) : undefined,
      expiresAt: data.expiresAt,
    },
  });

  // Create audit log
  await prisma.auditLog.create({
    data: {
      action: "UPDATE_API_KEY",
      entityType: "ApiKey",
      entityId: apiKey.id,
      userId,
      details: {
        name: apiKey.name,
        scopes: scopes ?? JSON.parse(existingKey.scopes),
      },
    },
  });

  return apiKey;
}

/**
 * Revoke an API key
 */
export async function revokeApiKey(
  id: string,
  userId: string
): Promise<boolean> {
  const existingKey = await prisma.apiKey.findFirst({
    where: { id, userId, revokedAt: null },
  });

  if (!existingKey) return false;

  await prisma.apiKey.update({
    where: { id },
    data: { revokedAt: new Date() },
  });

  // Create audit log
  await prisma.auditLog.create({
    data: {
      action: "REVOKE_API_KEY",
      entityType: "ApiKey",
      entityId: id,
      userId,
      details: { name: existingKey.name },
    },
  });

  return true;
}

/**
 * Delete an API key permanently
 */
export async function deleteApiKey(
  id: string,
  userId: string
): Promise<boolean> {
  const existingKey = await prisma.apiKey.findFirst({
    where: { id, userId },
  });

  if (!existingKey) return false;

  await prisma.apiKey.delete({
    where: { id },
  });

  // Create audit log
  await prisma.auditLog.create({
    data: {
      action: "DELETE_API_KEY",
      entityType: "ApiKey",
      entityId: id,
      userId,
      details: { name: existingKey.name },
    },
  });

  return true;
}

/**
 * Validate an API key and check scopes
 */
export async function validateApiKey(
  key: string,
  requiredScope?: ApiKeyScope
): Promise<{
  valid: boolean;
  userId?: string;
  scopes?: ApiKeyScope[];
  reason?: string;
}> {
  const apiKey = await prisma.apiKey.findUnique({
    where: { key },
  });

  if (!apiKey) {
    return { valid: false, reason: "Invalid API key" };
  }

  // Check if revoked
  if (apiKey.revokedAt) {
    return { valid: false, reason: "API key has been revoked" };
  }

  // Check if expired
  if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
    return { valid: false, reason: "API key has expired" };
  }

  const scopes = JSON.parse(apiKey.scopes) as ApiKeyScope[];

  // Check if required scope is present
  if (requiredScope) {
    const hasScope = scopes.includes(requiredScope) || scopes.includes("ADMIN");
    if (!hasScope) {
      return {
        valid: false,
        reason: `API key does not have required scope: ${requiredScope}`,
      };
    }
  }

  // Update last used timestamp
  await prisma.apiKey.update({
    where: { id: apiKey.id },
    data: { lastUsedAt: new Date() },
  });

  return {
    valid: true,
    userId: apiKey.userId,
    scopes,
  };
}

/**
 * Log API key usage
 */
export async function logApiKeyUsage(
  apiKeyId: string,
  data: {
    endpoint: string;
    method: string;
    statusCode: number;
    ipAddress?: string;
    userAgent?: string;
    duration?: number;
  }
): Promise<ApiKeyUsage> {
  return prisma.apiKeyUsage.create({
    data: {
      apiKeyId,
      endpoint: data.endpoint,
      method: data.method,
      statusCode: data.statusCode,
      ipAddress: data.ipAddress ?? null,
      userAgent: data.userAgent ?? null,
      duration: data.duration ?? null,
    },
  });
}

/**
 * Get API key usage logs
 */
export async function getApiKeyUsageLogs(
  options: ApiKeyUsageFilterOptions = {}
): Promise<ApiKeyUsageLog[]> {
  const { apiKeyId, startDate, endDate, limit = 100, offset = 0 } = options;

  const logs = await prisma.apiKeyUsage.findMany({
    where: {
      apiKeyId,
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    skip: offset,
  });

  return logs;
}

/**
 * Get API key by key string (internal use)
 */
export async function getApiKeyByKey(key: string): Promise<ApiKey | null> {
  return prisma.apiKey.findUnique({
    where: { key },
  });
}
