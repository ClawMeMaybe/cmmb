"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import type {
  Agent,
  AgentMetric,
  AgentPerformanceSummary,
  AgentTestResult,
  AgentTestRun,
  AgentStatus,
} from "@/types";
import { AVAILABLE_MODELS } from "@/types";

const statusColors: Record<AgentStatus, string> = {
  ACTIVE: "bg-green-500",
  INACTIVE: "bg-gray-500",
  TESTING: "bg-yellow-500",
  ERROR: "bg-red-500",
};

export default function AgentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const agentId = params.id as string;

  const [agent, setAgent] = useState<
    | (Agent & {
        performance?: AgentPerformanceSummary;
        testRuns?: AgentTestRun[];
      })
    | null
  >(null);
  const [metrics, setMetrics] = useState<AgentMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [model, setModel] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [enabled, setEnabled] = useState(true);
  const [status, setStatus] = useState<AgentStatus>("INACTIVE");

  // Test sandbox state
  const [testInput, setTestInput] = useState("");
  const [testResult, setTestResult] = useState<AgentTestResult | null>(null);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    async function fetchAgent() {
      try {
        const response = await fetch(`/api/agents/${agentId}`);
        if (!response.ok) {
          throw new Error("Failed to fetch agent");
        }
        const data = await response.json();
        const agentData = data.data;
        setAgent(agentData);
        setName(agentData.name);
        setDescription(agentData.description || "");
        setModel(agentData.model);
        setSystemPrompt(agentData.systemPrompt || "");
        setEnabled(agentData.enabled);
        setStatus(agentData.status);

        // Fetch metrics
        const metricsResponse = await fetch(`/api/agents/${agentId}/metrics`);
        if (metricsResponse.ok) {
          const metricsData = await metricsResponse.json();
          setMetrics(metricsData.data?.history || []);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    }

    fetchAgent();
  }, [agentId]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/agents/${agentId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description,
          model,
          systemPrompt,
          enabled,
          status,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save agent");
      }

      const data = await response.json();
      setAgent(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this agent?")) {
      return;
    }

    try {
      const response = await fetch(`/api/agents/${agentId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete agent");
      }

      router.push("/agents");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete");
    }
  };

  const handleTest = async () => {
    if (!testInput.trim()) {
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      const response = await fetch(`/api/agents/${agentId}/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: testInput }),
      });

      if (!response.ok) {
        throw new Error("Test failed");
      }

      const data = await response.json();
      setTestResult(data.data);
    } catch (err) {
      setTestResult({
        success: false,
        error: err instanceof Error ? err.message : "Test failed",
      });
    } finally {
      setTesting(false);
    }
  };

  const handleStatusChange = async (newStatus: AgentStatus) => {
    setStatus(newStatus);
    try {
      const response = await fetch(`/api/agents/${agentId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        const data = await response.json();
        setAgent(data.data);
      }
    } catch (err) {
      console.error("Failed to update status:", err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <p>Loading...</p>
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-destructive">Agent not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/agents"
            className="text-muted-foreground hover:underline"
          >
            &larr; Back to Agents
          </Link>
          <h1 className="text-3xl font-bold tracking-tight mt-2">
            {agent.name}
          </h1>
          <p className="text-muted-foreground">
            {agent.description || "No description"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={`${statusColors[agent.status]} text-white`}>
            {agent.status}
          </Badge>
          <Button variant="destructive" onClick={handleDelete}>
            Delete
          </Button>
        </div>
      </div>

      <Tabs defaultValue="config">
        <TabsList>
          <TabsTrigger value="config">Configuration</TabsTrigger>
          <TabsTrigger value="test">Test Sandbox</TabsTrigger>
          <TabsTrigger value="metrics">Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="config" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Agent Configuration</CardTitle>
              <CardDescription>
                Configure the agent&apos;s model, system prompt, and settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {error && <div className="text-destructive text-sm">{error}</div>}

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="model">Model</Label>
                  <Select value={model} onValueChange={(v) => v && setModel(v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select model" />
                    </SelectTrigger>
                    <SelectContent>
                      {AVAILABLE_MODELS.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="systemPrompt">System Prompt</Label>
                <textarea
                  id="systemPrompt"
                  className="flex min-h-[200px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  placeholder="Enter the system prompt for this agent..."
                />
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Label htmlFor="enabled">Enabled</Label>
                  <Switch
                    id="enabled"
                    checked={enabled}
                    onCheckedChange={setEnabled}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={status}
                    onValueChange={(v) => handleStatusChange(v as AgentStatus)}
                  >
                    <SelectTrigger className="w-[150px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ACTIVE">ACTIVE</SelectItem>
                      <SelectItem value="INACTIVE">INACTIVE</SelectItem>
                      <SelectItem value="TESTING">TESTING</SelectItem>
                      <SelectItem value="ERROR">ERROR</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="test" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Test Sandbox</CardTitle>
              <CardDescription>
                Test the agent with sample inputs to verify behavior
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="testInput">Test Input</Label>
                <textarea
                  id="testInput"
                  className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={testInput}
                  onChange={(e) => setTestInput(e.target.value)}
                  placeholder="Enter a test message to send to the agent..."
                />
              </div>

              <Button
                onClick={handleTest}
                disabled={testing || !testInput.trim()}
              >
                {testing ? "Running..." : "Run Test"}
              </Button>

              {testResult && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Badge
                      className={`${testResult.success ? "bg-green-500" : "bg-red-500"} text-white`}
                    >
                      {testResult.success ? "Success" : "Failed"}
                    </Badge>
                    {testResult.duration && (
                      <span className="text-sm text-muted-foreground">
                        {testResult.duration}ms
                      </span>
                    )}
                  </div>

                  {testResult.error && (
                    <div className="text-destructive text-sm">
                      Error: {testResult.error}
                    </div>
                  )}

                  {testResult.output && (
                    <div className="space-y-2">
                      <Label>Output</Label>
                      <div className="bg-muted p-4 rounded-lg overflow-auto max-h-[400px]">
                        <pre className="text-sm whitespace-pre-wrap break-words">
                          {testResult.output}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent test runs */}
          {agent.testRuns && agent.testRuns.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Recent Test Runs</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {agent.testRuns.slice(0, 5).map((run) => (
                    <div key={run.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <Badge
                          className={`${run.success ? "bg-green-500" : "bg-red-500"} text-white`}
                        >
                          {run.success ? "Success" : "Failed"}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {new Date(run.createdAt).toLocaleString()}
                          {run.duration && ` - ${run.duration}ms`}
                        </span>
                      </div>
                      <div className="text-sm">
                        <span className="text-muted-foreground">Input: </span>
                        {run.input.slice(0, 100)}
                        {run.input.length > 100 && "..."}
                      </div>
                      {run.error && (
                        <div className="text-destructive text-sm mt-2">
                          Error: {run.error}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="metrics" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Performance Metrics</CardTitle>
              <CardDescription>
                Agent performance over the last 30 days
              </CardDescription>
            </CardHeader>
            <CardContent>
              {agent.performance ? (
                <div className="grid gap-4 md:grid-cols-4">
                  <div className="border rounded-lg p-4">
                    <div className="text-sm text-muted-foreground">
                      Total Runs
                    </div>
                    <div className="text-2xl font-bold">
                      {agent.performance.totalRuns}
                    </div>
                  </div>
                  <div className="border rounded-lg p-4">
                    <div className="text-sm text-muted-foreground">
                      Success Rate
                    </div>
                    <div className="text-2xl font-bold">
                      {agent.performance.successRate.toFixed(1)}%
                    </div>
                  </div>
                  <div className="border rounded-lg p-4">
                    <div className="text-sm text-muted-foreground">
                      Avg Duration
                    </div>
                    <div className="text-2xl font-bold">
                      {agent.performance.avgDuration.toFixed(0)}ms
                    </div>
                  </div>
                  <div className="border rounded-lg p-4">
                    <div className="text-sm text-muted-foreground">
                      Last Run
                    </div>
                    <div className="text-lg font-medium">
                      {agent.performance.lastRunAt
                        ? new Date(
                            agent.performance.lastRunAt
                          ).toLocaleDateString()
                        : "Never"}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No performance data available yet. Run some tests to generate
                  metrics.
                </div>
              )}
            </CardContent>
          </Card>

          {metrics.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Metrics History</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {metrics.slice(0, 10).map((metric) => (
                    <div key={metric.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">
                          {new Date(metric.date).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Runs: </span>
                          {metric.totalRuns}
                        </div>
                        <div>
                          <span className="text-muted-foreground">
                            Success:{" "}
                          </span>
                          {metric.successRate.toFixed(1)}%
                        </div>
                        <div>
                          <span className="text-muted-foreground">Avg: </span>
                          {metric.avgDuration.toFixed(0)}ms
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
