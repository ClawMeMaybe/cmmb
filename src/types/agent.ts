// Agent types
export type { Agent, AgentTestRun, AgentMetric } from "@prisma/client";
export { AgentStatus } from "@prisma/client";

// Agent configuration options
export interface AgentConfig {
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stopSequences?: string[];
  customHeaders?: Record<string, string>;
}

// Agent input for create/update
export interface AgentInput {
  name: string;
  description?: string;
  model?: string;
  systemPrompt?: string;
  status?: "ACTIVE" | "INACTIVE" | "TESTING" | "ERROR";
  enabled?: boolean;
  config?: AgentConfig;
  instanceId?: string;
}

// Agent test input
export interface AgentTestInput {
  input: string;
}

// Agent test result
export interface AgentTestResult {
  success: boolean;
  output?: string;
  error?: string;
  duration?: number;
}

// Agent performance metrics summary
export interface AgentPerformanceSummary {
  totalRuns: number;
  successRate: number;
  avgDuration: number;
  lastRunAt?: string;
}

// Available AI models
export const AVAILABLE_MODELS = [
  {
    id: "claude-opus-4-6",
    name: "Claude Opus 4.6",
    description: "Most capable model",
  },
  {
    id: "claude-sonnet-4-6",
    name: "Claude Sonnet 4.6",
    description: "Balanced performance and cost",
  },
  {
    id: "claude-sonnet-4-5",
    name: "Claude Sonnet 4.5",
    description: "Previous generation Sonnet",
  },
  {
    id: "claude-haiku-4-5",
    name: "Claude Haiku 4.5",
    description: "Fast and efficient",
  },
] as const;

export type ModelId = (typeof AVAILABLE_MODELS)[number]["id"];

// Agent status colors for display
export const AGENT_STATUS_COLORS: Record<string, string> = {
  ACTIVE: "bg-green-500",
  INACTIVE: "bg-gray-500",
  TESTING: "bg-yellow-500",
  ERROR: "bg-red-500",
};
