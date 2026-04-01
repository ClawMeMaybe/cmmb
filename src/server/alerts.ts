import { prisma } from "@/lib/prisma";
import type {
  AlertConfig,
  Alert,
  AlertConfigInput,
  AlertConfigUpdateInput,
  AlertCreateInput,
  AlertFilterOptions,
  AlertWithRelations,
  AlertSummary,
} from "@/types";
import { AlertSeverity, AlertStatus } from "@prisma/client";

// ==================== Alert Config Operations ====================

export async function getAlertConfigs(): Promise<AlertConfig[]> {
  return prisma.alertConfig.findMany({
    orderBy: { createdAt: "desc" },
  });
}

export async function getAlertConfigById(
  id: string
): Promise<AlertConfig | null> {
  return prisma.alertConfig.findUnique({
    where: { id },
  });
}

export async function createAlertConfig(
  data: AlertConfigInput
): Promise<AlertConfig> {
  return prisma.alertConfig.create({
    data: {
      name: data.name,
      description: data.description,
      enabled: data.enabled ?? true,
      metricType: data.metricType,
      operator: data.operator,
      threshold: data.threshold,
      duration: data.duration ?? 60,
      emailEnabled: data.emailEnabled ?? true,
      emailRecipients: data.emailRecipients,
    },
  });
}

export async function updateAlertConfig(
  id: string,
  data: AlertConfigUpdateInput
): Promise<AlertConfig | null> {
  return prisma.alertConfig.update({
    where: { id },
    data,
  });
}

export async function deleteAlertConfig(id: string): Promise<boolean> {
  await prisma.alertConfig.delete({
    where: { id },
  });
  return true;
}

// ==================== Alert Operations ====================

export async function getAlerts(
  options: AlertFilterOptions = {}
): Promise<AlertWithRelations[]> {
  const {
    status,
    severity,
    instanceId,
    configId,
    limit = 50,
    offset = 0,
  } = options;

  const alerts = await prisma.alert.findMany({
    where: {
      status: status as AlertStatus | undefined,
      severity: severity as AlertSeverity | undefined,
      instanceId,
      configId,
    },
    include: {
      config: {
        select: {
          id: true,
          name: true,
          metricType: true,
        },
      },
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
          name: true,
          email: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    skip: offset,
  });

  return alerts.map((alert) => ({
    ...alert,
    details: alert.details as Record<string, unknown> | null,
  }));
}

export async function getAlertById(
  id: string
): Promise<AlertWithRelations | null> {
  const alert = await prisma.alert.findUnique({
    where: { id },
    include: {
      config: {
        select: {
          id: true,
          name: true,
          metricType: true,
        },
      },
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
          name: true,
          email: true,
        },
      },
    },
  });

  if (!alert) return null;

  return {
    ...alert,
    details: alert.details as Record<string, unknown> | null,
  };
}

export async function createAlert(data: AlertCreateInput): Promise<Alert> {
  return prisma.alert.create({
    data: {
      configId: data.configId,
      instanceId: data.instanceId,
      severity: (data.severity as AlertSeverity) ?? AlertSeverity.WARNING,
      status: AlertStatus.ACTIVE,
      title: data.title,
      message: data.message,
      details: data.details
        ? JSON.parse(JSON.stringify(data.details))
        : undefined,
      metricType: data.metricType,
      metricValue: data.metricValue,
      threshold: data.threshold,
    },
  });
}

export async function acknowledgeAlert(
  id: string,
  userId: string,
  note?: string
): Promise<Alert | null> {
  return prisma.alert.update({
    where: { id },
    data: {
      status: AlertStatus.ACKNOWLEDGED,
      acknowledgedAt: new Date(),
      acknowledgedById: userId,
      acknowledgmentNote: note,
    },
  });
}

export async function resolveAlert(id: string): Promise<Alert | null> {
  return prisma.alert.update({
    where: { id },
    data: {
      status: AlertStatus.RESOLVED,
      resolvedAt: new Date(),
    },
  });
}

export async function deleteAlert(id: string): Promise<boolean> {
  await prisma.alert.delete({
    where: { id },
  });
  return true;
}

export async function getAlertSummary(): Promise<AlertSummary> {
  const totalActive = await prisma.alert.count({
    where: { status: AlertStatus.ACTIVE },
  });

  const totalAcknowledged = await prisma.alert.count({
    where: { status: AlertStatus.ACKNOWLEDGED },
  });

  const totalResolved = await prisma.alert.count({
    where: { status: AlertStatus.RESOLVED },
  });

  const infoCount = await prisma.alert.count({
    where: { severity: AlertSeverity.INFO },
  });

  const warningCount = await prisma.alert.count({
    where: { severity: AlertSeverity.WARNING },
  });

  const criticalCount = await prisma.alert.count({
    where: { severity: AlertSeverity.CRITICAL },
  });

  const recentAlerts = await getAlerts({ limit: 5 });

  return {
    totalActive,
    totalAcknowledged,
    totalResolved,
    bySeverity: {
      INFO: infoCount,
      WARNING: warningCount,
      CRITICAL: criticalCount,
    },
    recentAlerts,
  };
}

export async function checkAndTriggerAlerts(
  instanceId: string,
  metrics: {
    cpu: number | null;
    memory: number | null;
    status: string;
  }
): Promise<Alert[]> {
  const configs = await prisma.alertConfig.findMany({
    where: { enabled: true },
  });

  const triggeredAlerts: Alert[] = [];

  for (const config of configs) {
    let metricValue: number | null = null;
    let shouldTrigger = false;

    switch (config.metricType) {
      case "cpu":
        metricValue = metrics.cpu;
        shouldTrigger = compareThreshold(
          metricValue,
          config.operator,
          config.threshold
        );
        break;
      case "memory":
        metricValue = metrics.memory;
        shouldTrigger = compareThreshold(
          metricValue,
          config.operator,
          config.threshold
        );
        break;
      case "status_offline":
        shouldTrigger = metrics.status === "offline";
        break;
      case "status_error":
        shouldTrigger = metrics.status === "error";
        break;
      default:
        break;
    }

    if (shouldTrigger) {
      const existingAlert = await prisma.alert.findFirst({
        where: {
          configId: config.id,
          instanceId,
          status: AlertStatus.ACTIVE,
        },
      });

      if (!existingAlert) {
        const instance = await prisma.instance.findUnique({
          where: { id: instanceId },
        });

        const alert = await createAlert({
          configId: config.id,
          instanceId,
          severity: config.metricType.startsWith("status")
            ? AlertSeverity.CRITICAL
            : metricValue && metricValue > config.threshold * 1.5
              ? AlertSeverity.CRITICAL
              : AlertSeverity.WARNING,
          title: `${config.name} - ${instance?.name ?? "Unknown Instance"}`,
          message: config.metricType.startsWith("status")
            ? `Instance ${instance?.name ?? "Unknown"} is ${metrics.status}`
            : `${config.metricType} is at ${metricValue?.toFixed(1)}%, threshold is ${config.threshold}%`,
          metricType: config.metricType,
          metricValue,
          threshold: config.threshold,
        });

        triggeredAlerts.push(alert);

        if (config.emailEnabled && config.emailRecipients) {
          sendEmailNotification(alert, config.emailRecipients).catch((err) => {
            console.error("Failed to send email notification:", err);
          });
        }
      }
    }
  }

  return triggeredAlerts;
}

function compareThreshold(
  value: number | null,
  operator: string,
  threshold: number
): boolean {
  if (value === null) return false;

  switch (operator) {
    case ">":
      return value > threshold;
    case ">=":
      return value >= threshold;
    case "<":
      return value < threshold;
    case "<=":
      return value <= threshold;
    case "==":
      return value === threshold;
    case "!=":
      return value !== threshold;
    default:
      return false;
  }
}

async function sendEmailNotification(
  alert: Alert,
  recipients: string
): Promise<void> {
  console.log(`[Alert Email] Alert ${alert.id}: ${alert.title}`);
  console.log(`Recipients: ${recipients}`);
  console.log(`Message: ${alert.message}`);

  await prisma.alert.update({
    where: { id: alert.id },
    data: { emailSentAt: new Date() },
  });
}
