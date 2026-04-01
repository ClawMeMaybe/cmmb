// Agent types for ClawMeMaybe

// Import Prisma-generated types
import { AgentStatus } from "@prisma/client";
import type { Agent, AgentMetric } from "@prisma/client";

// Re-export Prisma-generated types
export { AgentStatus } from "@prisma/client";
export type { Agent, AgentMetric } from "@prisma/client";

// Agent model configuration types
export interface AgentModelConfig {
  modelName: string;
  temperature: number;
  maxTokens: number;
  topP: number;
  topK: number;
}

// Agent capabilities
export interface AgentCapabilities {
  toolsEnabled: boolean;
  webSearchEnabled: boolean;
  codeExecutionEnabled: boolean;
  imageGenerationEnabled: boolean;
  customSkills?: string[];
}

// Agent with metrics (for dashboard display)
export interface AgentWithMetrics {
  id: string;
  name: string;
  description: string | null;
  status: AgentStatus;
  enabled: boolean;
  modelName: string;
  temperature: number;
  maxTokens: number;
  topP: number;
  topK: number;
  systemPrompt: string | null;
  capabilities: AgentCapabilities | null;
  instanceId: string | null;
  lastError: string | null;
  lastErrorAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  metrics?: AgentMetricSummary;
}

// Agent metric summary for dashboard
export interface AgentMetricSummary {
  totalRequests: number;
  successRate: number;
  avgLatency: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  periodStart: Date;
  periodEnd: Date;
}

// Agent test request
export interface AgentTestRequest {
  input: string;
  context?: Record<string, unknown>;
}

// Agent test response
export interface AgentTestResponse {
  output: string;
  latency: number;
  inputTokens: number;
  outputTokens: number;
  success: boolean;
  error?: string;
}

// Agent create input
export interface AgentCreateInput {
  name: string;
  description?: string;
  status?: AgentStatus;
  enabled?: boolean;
  modelName?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  topK?: number;
  systemPrompt?: string;
  capabilities?: AgentCapabilities;
  instanceId?: string;
}

// Agent update input
export interface AgentUpdateInput {
  name?: string;
  description?: string;
  status?: AgentStatus;
  enabled?: boolean;
  modelName?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  topK?: number;
  systemPrompt?: string;
  capabilities?: AgentCapabilities;
  instanceId?: string;
}

// Agent filters for listing
export interface AgentFilters {
  status?: AgentStatus;
  instanceId?: string;
  enabled?: boolean;
  search?: string;
}

// Agent metrics query params
export interface AgentMetricsQueryParams {
  agentId: string;
  periodStart?: Date;
  periodEnd?: Date;
  limit?: number;
}

// Available models for agent configuration
export const AVAILABLE_MODELS = [
  {
    id: "claude-opus-4-6",
    name: "Claude Opus 4.6",
    description: "Most capable model for complex tasks",
  },
  {
    id: "claude-sonnet-4-6",
    name: "Claude Sonnet 4.6",
    description: "Balanced performance and speed",
  },
  {
    id: "claude-haiku-4-5",
    name: "Claude Haiku 4.5",
    description: "Fastest model for simple tasks",
  },
] as const;

export type AvailableModelId = (typeof AVAILABLE_MODELS)[number]["id"];

// Default agent configuration
export const DEFAULT_AGENT_CONFIG: AgentModelConfig = {
  modelName: "claude-opus-4-6",
  temperature: 0.7,
  maxTokens: 4096,
  topP: 1.0,
  topK: 0,
};

// Default agent capabilities
export const DEFAULT_AGENT_CAPABILITIES: AgentCapabilities = {
  toolsEnabled: true,
  webSearchEnabled: false,
  codeExecutionEnabled: false,
  imageGenerationEnabled: false,
  customSkills: [],
};
