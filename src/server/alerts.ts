import { prisma } from "@/lib/prisma";
import type { Alert, AlertSeverity, AlertStatus, Prisma } from "@prisma/client";

export interface CreateAlertOptions {
  title: string;
  message: string;
  severity?: AlertSeverity;
  source?: string;
  instanceId?: string;
  metadata?: Record<string, unknown>;
}

export interface UpdateAlertOptions {
  status?: AlertStatus;
  acknowledgedById?: string;
}

export interface GetAlertsOptions {
  status?: AlertStatus;
  severity?: AlertSeverity;
  instanceId?: string;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  pageSize?: number;
}

/**
 * Create a new alert
 */
export async function createAlert(options: CreateAlertOptions): Promise<Alert> {
  const metadataValue = options.metadata
    ? (JSON.parse(JSON.stringify(options.metadata)) as Prisma.InputJsonValue)
    : undefined;

  return prisma.alert.create({
    data: {
      title: options.title,
      message: options.message,
      severity: options.severity ?? "WARNING",
      source: options.source ?? "system",
      instanceId: options.instanceId ?? null,
      metadata: metadataValue,
    },
    include: {
      instance: {
        select: {
          id: true,
          name: true,
          status: true,
        },
      },
    },
  });
}

/**
 * Get alerts with filtering and pagination
 */
export async function getAlerts(options: GetAlertsOptions = {}) {
  const {
    status,
    severity,
    instanceId,
    startDate,
    endDate,
    page = 1,
    pageSize = 20,
  } = options;

  const where = {
    ...(status && { status }),
    ...(severity && { severity }),
    ...(instanceId && { instanceId }),
    ...(startDate && { createdAt: { gte: startDate } }),
    ...(endDate && { createdAt: { lte: endDate } }),
  };

  const [alerts, total] = await Promise.all([
    prisma.alert.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        instance: {
          select: {
            id: true,
            name: true,
            status: true,
          },
        },
        acknowledgedBy: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    }),
    prisma.alert.count({ where }),
  ]);

  return {
    alerts,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  };
}

/**
 * Get an alert by ID
 */
export async function getAlertById(id: string): Promise<Alert | null> {
  return prisma.alert.findUnique({
    where: { id },
    include: {
      instance: {
        select: {
          id: true,
          name: true,
          status: true,
          gatewayUrl: true,
        },
      },
      acknowledgedBy: {
        select: {
          id: true,
          email: true,
          name: true,
        },
      },
    },
  });
}

/**
 * Update an alert
 */
export async function updateAlert(
  id: string,
  options: UpdateAlertOptions
): Promise<Alert> {
  const updateData: {
    status?: AlertStatus;
    acknowledgedById?: string | null;
    resolvedAt?: Date;
  } = {};

  if (options.status) {
    updateData.status = options.status;
    if (options.status === "RESOLVED") {
      updateData.resolvedAt = new Date();
    }
  }

  if (options.acknowledgedById) {
    updateData.acknowledgedById = options.acknowledgedById;
    if (!updateData.status) {
      updateData.status = "ACKNOWLEDGED";
    }
  }

  return prisma.alert.update({
    where: { id },
    data: updateData,
    include: {
      instance: {
        select: {
          id: true,
          name: true,
          status: true,
        },
      },
      acknowledgedBy: {
        select: {
          id: true,
          email: true,
          name: true,
        },
      },
    },
  });
}

/**
 * Delete an alert
 */
export async function deleteAlert(id: string): Promise<Alert> {
  return prisma.alert.delete({
    where: { id },
  });
}

/**
 * Get active alerts count for an instance
 */
export async function getActiveAlertsCount(
  instanceId?: string
): Promise<number> {
  return prisma.alert.count({
    where: {
      status: "ACTIVE",
      ...(instanceId && { instanceId }),
    },
  });
}

/**
 * Get all active alerts
 */
export async function getActiveAlerts(instanceId?: string): Promise<Alert[]> {
  return prisma.alert.findMany({
    where: {
      status: "ACTIVE",
      ...(instanceId && { instanceId }),
    },
    orderBy: { createdAt: "desc" },
    include: {
      instance: {
        select: {
          id: true,
          name: true,
          status: true,
        },
      },
    },
  });
}

/**
 * Resolve all active alerts for an instance
 */
export async function resolveInstanceAlerts(
  instanceId: string
): Promise<number> {
  const result = await prisma.alert.updateMany({
    where: {
      instanceId,
      status: "ACTIVE",
    },
    data: {
      status: "RESOLVED",
      resolvedAt: new Date(),
    },
  });
  return result.count;
}
