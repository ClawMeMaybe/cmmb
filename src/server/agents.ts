import { prisma } from "@/lib/prisma";
import type {
  Agent,
  AgentTestRun,
  AgentMetric,
  AuditLog,
} from "@prisma/client";
import { AgentStatus } from "@prisma/client";
import type { AgentInput, AgentPerformanceSummary } from "@/types";

export async function getAgents(options?: {
  instanceId?: string;
  status?: AgentStatus;
}): Promise<Agent[]> {
  const agents = await prisma.agent.findMany({
    where: {
      instanceId: options?.instanceId ?? undefined,
      status: options?.status ?? undefined,
    },
    orderBy: { createdAt: "desc" },
    include: {
      metrics: {
        orderBy: { date: "desc" },
        take: 1,
      },
    },
  });
  return agents;
}

export async function getAgentById(id: string): Promise<Agent | null> {
  const agent = await prisma.agent.findUnique({
    where: { id },
    include: {
      metrics: {
        orderBy: { date: "desc" },
        take: 30,
      },
      testRuns: {
        orderBy: { createdAt: "desc" },
        take: 10,
      },
    },
  });
  return agent;
}

export async function getAgentByName(name: string): Promise<Agent | null> {
  const agent = await prisma.agent.findUnique({
    where: { name },
  });
  return agent;
}

export async function createAgent(
  data: AgentInput,
  userId: string
): Promise<Agent> {
  const agent = await prisma.agent.create({
    data: {
      name: data.name,
      description: data.description ?? null,
      model: data.model ?? "claude-sonnet-4-5",
      systemPrompt: data.systemPrompt ?? null,
      status: data.status ? (data.status as AgentStatus) : AgentStatus.INACTIVE,
      enabled: data.enabled ?? true,
      config: data.config ? JSON.parse(JSON.stringify(data.config)) : null,
      instanceId: data.instanceId ?? null,
    },
  });

  // Create audit log
  await createAgentAuditLog({
    action: "CREATE_AGENT",
    entityType: "Agent",
    entityId: agent.id,
    userId,
    details: { name: agent.name, model: agent.model },
  });

  return agent;
}

export async function updateAgent(
  id: string,
  data: Partial<AgentInput>,
  userId: string
): Promise<Agent | null> {
  const agent = await prisma.agent.update({
    where: { id },
    data: {
      name: data.name,
      description: data.description,
      model: data.model,
      systemPrompt: data.systemPrompt,
      status: data.status ? (data.status as AgentStatus) : undefined,
      enabled: data.enabled,
      config: data.config ? JSON.parse(JSON.stringify(data.config)) : undefined,
      instanceId: data.instanceId,
    },
  });

  // Create audit log
  await createAgentAuditLog({
    action: "UPDATE_AGENT",
    entityType: "Agent",
    entityId: id,
    userId,
    details: data as Record<string, unknown>,
  });

  return agent;
}

export async function deleteAgent(
  id: string,
  userId: string
): Promise<boolean> {
  await prisma.agent.delete({
    where: { id },
  });

  // Create audit log
  await createAgentAuditLog({
    action: "DELETE_AGENT",
    entityType: "Agent",
    entityId: id,
    userId,
  });

  return true;
}

export async function createAgentTestRun(data: {
  agentId: string;
  input: string;
  output?: string;
  success: boolean;
  duration?: number;
  error?: string;
}): Promise<AgentTestRun> {
  const testRun = await prisma.agentTestRun.create({
    data: {
      agentId: data.agentId,
      input: data.input,
      output: data.output ?? null,
      success: data.success,
      duration: data.duration ?? null,
      error: data.error ?? null,
    },
  });

  // Update agent metrics
  await updateAgentMetrics(data.agentId, data.success, data.duration ?? 0);

  return testRun;
}

export async function getAgentTestRuns(
  agentId: string,
  limit?: number
): Promise<AgentTestRun[]> {
  return prisma.agentTestRun.findMany({
    where: { agentId },
    orderBy: { createdAt: "desc" },
    take: limit ?? 20,
  });
}

export async function getAgentPerformance(
  agentId: string
): Promise<AgentPerformanceSummary> {
  // Get today's metrics
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const metrics = await prisma.agentMetric.findFirst({
    where: {
      agentId,
      date: today,
    },
  });

  if (metrics) {
    return {
      totalRuns: metrics.totalRuns,
      successRate: metrics.successRate,
      avgDuration: metrics.avgDuration,
      lastRunAt: metrics.lastRunAt?.toISOString(),
    };
  }

  // Calculate from test runs if no metric record exists
  const testRuns = await prisma.agentTestRun.findMany({
    where: { agentId },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  if (testRuns.length === 0) {
    return {
      totalRuns: 0,
      successRate: 0,
      avgDuration: 0,
    };
  }

  const successfulRuns = testRuns.filter((r) => r.success);
  const durations = testRuns
    .filter((r) => r.duration !== null)
    .map((r) => r.duration as number);

  return {
    totalRuns: testRuns.length,
    successRate: (successfulRuns.length / testRuns.length) * 100,
    avgDuration:
      durations.length > 0
        ? durations.reduce((a, b) => a + b, 0) / durations.length
        : 0,
    lastRunAt: testRuns[0]?.createdAt.toISOString(),
  };
}

async function updateAgentMetrics(
  agentId: string,
  success: boolean,
  duration: number
): Promise<void> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Try to find existing metric record for today
  const existing = await prisma.agentMetric.findUnique({
    where: {
      agentId_date: {
        agentId,
        date: today,
      },
    },
  });

  if (existing) {
    // Update existing record
    const newTotalRuns = existing.totalRuns + 1;
    const newSuccessCount = success
      ? (existing.successRate * existing.totalRuns) / 100 + 1
      : (existing.successRate * existing.totalRuns) / 100;

    const newAvgDuration =
      duration > 0
        ? (existing.avgDuration * existing.totalRuns + duration) / newTotalRuns
        : existing.avgDuration;

    await prisma.agentMetric.update({
      where: { id: existing.id },
      data: {
        totalRuns: newTotalRuns,
        successRate: (newSuccessCount / newTotalRuns) * 100,
        avgDuration: newAvgDuration,
        lastRunAt: new Date(),
      },
    });
  } else {
    // Create new metric record
    await prisma.agentMetric.create({
      data: {
        agentId,
        totalRuns: 1,
        successRate: success ? 100 : 0,
        avgDuration: duration > 0 ? duration : 0,
        lastRunAt: new Date(),
        date: today,
      },
    });
  }
}

export async function getAgentMetricsHistory(
  agentId: string,
  days?: number
): Promise<AgentMetric[]> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - (days ?? 30));
  startDate.setHours(0, 0, 0, 0);

  return prisma.agentMetric.findMany({
    where: {
      agentId,
      date: { gte: startDate },
    },
    orderBy: { date: "asc" },
  });
}

async function createAgentAuditLog(data: {
  action: string;
  entityType: string;
  entityId: string;
  userId: string;
  details?: Record<string, unknown>;
}): Promise<AuditLog> {
  return prisma.auditLog.create({
    data: {
      action: data.action,
      entityType: data.entityType,
      entityId: data.entityId,
      userId: data.userId,
      details: data.details ? JSON.parse(JSON.stringify(data.details)) : null,
    },
  });
}
