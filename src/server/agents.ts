import { prisma } from "@/lib/prisma";
import type { Agent, AgentMetric, AuditLog } from "@prisma/client";
import { AgentStatus } from "@prisma/client";
import type {
  AgentCreateInput,
  AgentUpdateInput,
  AgentFilters,
  AgentWithMetrics,
  AgentMetricSummary,
  AgentCapabilities,
  AgentTestRequest,
  AgentTestResponse,
  AgentMetricsQueryParams,
} from "@/types/agent";

// Get all agents with optional filtering
export async function getAgents(filters?: AgentFilters): Promise<Agent[]> {
  const where: Record<string, unknown> = {};

  if (filters?.status) {
    where.status = filters.status;
  }
  if (filters?.instanceId) {
    where.instanceId = filters.instanceId;
  }
  if (filters?.enabled !== undefined) {
    where.enabled = filters.enabled;
  }
  if (filters?.search) {
    where.name = { contains: filters.search, mode: "insensitive" };
  }

  const agents = await prisma.agent.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });

  return agents;
}

// Get agent by ID
export async function getAgentById(id: string): Promise<Agent | null> {
  const agent = await prisma.agent.findUnique({
    where: { id },
  });
  return agent;
}

// Get agent with metrics summary
export async function getAgentWithMetrics(
  id: string
): Promise<AgentWithMetrics | null> {
  const agent = await prisma.agent.findUnique({
    where: { id },
    include: {
      metrics: {
        orderBy: { periodStart: "desc" },
        take: 10,
      },
    },
  });

  if (!agent) {
    return null;
  }

  // Calculate metric summary
  let metricsSummary: AgentMetricSummary | undefined;
  if (agent.metrics.length > 0) {
    const totalRequests = agent.metrics.reduce(
      (sum, m) => sum + m.requestCount,
      0
    );
    const successCount = agent.metrics.reduce(
      (sum, m) => sum + m.successCount,
      0
    );
    const avgLatencies = agent.metrics
      .filter((m) => m.avgLatency !== null)
      .map((m) => m.avgLatency!);
    const avgLatency =
      avgLatencies.length > 0
        ? avgLatencies.reduce((sum, l) => sum + l, 0) / avgLatencies.length
        : 0;

    metricsSummary = {
      totalRequests,
      successRate: totalRequests > 0 ? (successCount / totalRequests) * 100 : 0,
      avgLatency,
      totalInputTokens: agent.metrics.reduce(
        (sum, m) => sum + m.inputTokens,
        0
      ),
      totalOutputTokens: agent.metrics.reduce(
        (sum, m) => sum + m.outputTokens,
        0
      ),
      periodStart: agent.metrics[agent.metrics.length - 1].periodStart,
      periodEnd: agent.metrics[0].periodEnd,
    };
  }

  return {
    ...agent,
    capabilities: agent.capabilities as AgentCapabilities | null,
    metrics: metricsSummary,
  };
}

// Create a new agent
export async function createAgent(
  data: AgentCreateInput,
  userId: string
): Promise<Agent> {
  const agent = await prisma.agent.create({
    data: {
      name: data.name,
      description: data.description ?? null,
      status: data.status ?? AgentStatus.INACTIVE,
      enabled: data.enabled ?? true,
      modelName: data.modelName ?? "claude-opus-4-6",
      temperature: data.temperature ?? 0.7,
      maxTokens: data.maxTokens ?? 4096,
      topP: data.topP ?? 1.0,
      topK: data.topK ?? 0,
      systemPrompt: data.systemPrompt ?? null,
      capabilities: data.capabilities
        ? JSON.parse(JSON.stringify(data.capabilities))
        : null,
      instanceId: data.instanceId ?? null,
    },
  });

  // Create audit log
  await createAgentAuditLog({
    action: "CREATE_AGENT",
    entityType: "Agent",
    entityId: agent.id,
    userId,
    agentId: agent.id,
    details: {
      name: agent.name,
      modelName: agent.modelName,
      status: agent.status,
    },
  });

  return agent;
}

// Update an existing agent
export async function updateAgent(
  id: string,
  data: AgentUpdateInput,
  userId: string
): Promise<Agent | null> {
  const agent = await prisma.agent.update({
    where: { id },
    data: {
      name: data.name,
      description: data.description,
      status: data.status,
      enabled: data.enabled,
      modelName: data.modelName,
      temperature: data.temperature,
      maxTokens: data.maxTokens,
      topP: data.topP,
      topK: data.topK,
      systemPrompt: data.systemPrompt,
      capabilities: data.capabilities
        ? JSON.parse(JSON.stringify(data.capabilities))
        : undefined,
      instanceId: data.instanceId,
    },
  });

  // Create audit log
  await createAgentAuditLog({
    action: "UPDATE_AGENT",
    entityType: "Agent",
    entityId: id,
    userId,
    agentId: id,
    details: data as Record<string, unknown>,
  });

  return agent;
}

// Delete an agent
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
    agentId: id,
  });

  return true;
}

// Enable/disable agent
export async function setAgentEnabled(
  id: string,
  enabled: boolean,
  userId: string
): Promise<Agent | null> {
  const agent = await prisma.agent.update({
    where: { id },
    data: {
      enabled,
      status: enabled ? AgentStatus.ACTIVE : AgentStatus.INACTIVE,
    },
  });

  await createAgentAuditLog({
    action: enabled ? "ENABLE_AGENT" : "DISABLE_AGENT",
    entityType: "Agent",
    entityId: id,
    userId,
    agentId: id,
    details: { enabled },
  });

  return agent;
}

// Test agent (sandbox testing)
export async function testAgent(
  id: string,
  testRequest: AgentTestRequest,
  userId: string
): Promise<AgentTestResponse> {
  const agent = await prisma.agent.findUnique({
    where: { id },
  });

  if (!agent) {
    return {
      output: "",
      latency: 0,
      inputTokens: 0,
      outputTokens: 0,
      success: false,
      error: "Agent not found",
    };
  }

  // Simulate a test run (actual implementation would call OpenClaw gateway)
  const startTime = Date.now();

  try {
    // Update agent status to testing
    await prisma.agent.update({
      where: { id },
      data: {
        status: AgentStatus.TESTING,
        lastTestInput: testRequest.input,
        lastTestAt: new Date(),
      },
    });

    // Simulated response for sandbox testing
    // In real implementation, this would call the OpenClaw gateway API
    const simulatedOutput = `[Test Output for Agent: ${agent.name}]\nModel: ${agent.modelName}\nInput: ${testRequest.input.substring(0, 100)}...\n\nThis is a simulated test response. In production, this would call the OpenClaw gateway with the agent's configuration.`;

    const latency = Date.now() - startTime;
    const inputTokens = Math.ceil(testRequest.input.length / 4);
    const outputTokens = Math.ceil(simulatedOutput.length / 4);

    // Update agent with test results
    await prisma.agent.update({
      where: { id },
      data: {
        status: AgentStatus.ACTIVE,
        lastTestOutput: simulatedOutput,
        lastTestAt: new Date(),
      },
    });

    // Create audit log for test
    await createAgentAuditLog({
      action: "TEST_AGENT",
      entityType: "Agent",
      entityId: id,
      userId,
      agentId: id,
      details: {
        inputLength: testRequest.input.length,
        outputLength: simulatedOutput.length,
        latency,
        inputTokens,
        outputTokens,
      },
    });

    return {
      output: simulatedOutput,
      latency,
      inputTokens,
      outputTokens,
      success: true,
    };
  } catch (error) {
    const latency = Date.now() - startTime;
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    // Update agent error state
    await prisma.agent.update({
      where: { id },
      data: {
        status: AgentStatus.ERROR,
        lastError: errorMessage,
        lastErrorAt: new Date(),
      },
    });

    return {
      output: "",
      latency,
      inputTokens: 0,
      outputTokens: 0,
      success: false,
      error: errorMessage,
    };
  }
}

// Get agent metrics
export async function getAgentMetrics(
  params: AgentMetricsQueryParams
): Promise<AgentMetric[]> {
  const where: Record<string, unknown> = {
    agentId: params.agentId,
  };

  if (params.periodStart) {
    where.periodStart = { gte: params.periodStart };
  }
  if (params.periodEnd) {
    where.periodEnd = { lte: params.periodEnd };
  }

  const metrics = await prisma.agentMetric.findMany({
    where,
    orderBy: { periodStart: "desc" },
    take: params.limit ?? 100,
  });

  return metrics;
}

// Record agent metric (called by monitoring system)
export async function recordAgentMetric(
  agentId: string,
  data: {
    requestCount: number;
    successCount: number;
    errorCount: number;
    avgLatency?: number;
    inputTokens?: number;
    outputTokens?: number;
    periodStart: Date;
    periodEnd: Date;
  }
): Promise<AgentMetric> {
  const metric = await prisma.agentMetric.create({
    data: {
      agentId,
      requestCount: data.requestCount,
      successCount: data.successCount,
      errorCount: data.errorCount,
      avgLatency: data.avgLatency ?? null,
      inputTokens: data.inputTokens ?? 0,
      outputTokens: data.outputTokens ?? 0,
      totalTokens: (data.inputTokens ?? 0) + (data.outputTokens ?? 0),
      periodStart: data.periodStart,
      periodEnd: data.periodEnd,
    },
  });

  return metric;
}

// Create audit log for agent actions
export async function createAgentAuditLog(data: {
  action: string;
  entityType: string;
  entityId: string;
  userId: string;
  agentId?: string;
  details?: Record<string, unknown>;
}): Promise<AuditLog> {
  return prisma.auditLog.create({
    data: {
      action: data.action,
      entityType: data.entityType,
      entityId: data.entityId,
      userId: data.userId,
      agentId: data.agentId ?? null,
      details: data.details ? JSON.parse(JSON.stringify(data.details)) : null,
    },
  });
}

// Update agent system prompt
export async function updateAgentSystemPrompt(
  id: string,
  systemPrompt: string,
  userId: string
): Promise<Agent | null> {
  const agent = await prisma.agent.update({
    where: { id },
    data: {
      systemPrompt,
    },
  });

  await createAgentAuditLog({
    action: "UPDATE_AGENT_PROMPT",
    entityType: "Agent",
    entityId: id,
    userId,
    agentId: id,
    details: { promptLength: systemPrompt.length },
  });

  return agent;
}

// Update agent model configuration
export async function updateAgentModelConfig(
  id: string,
  config: {
    modelName?: string;
    temperature?: number;
    maxTokens?: number;
    topP?: number;
    topK?: number;
  },
  userId: string
): Promise<Agent | null> {
  const agent = await prisma.agent.update({
    where: { id },
    data: config,
  });

  await createAgentAuditLog({
    action: "UPDATE_AGENT_MODEL_CONFIG",
    entityType: "Agent",
    entityId: id,
    userId,
    agentId: id,
    details: config,
  });

  return agent;
}
