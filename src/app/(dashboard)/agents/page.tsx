"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { Agent, AgentStatus } from "@/types";
import { AVAILABLE_MODELS } from "@/types";

const statusColors: Record<AgentStatus, string> = {
  ACTIVE: "bg-green-500",
  INACTIVE: "bg-gray-500",
  TESTING: "bg-yellow-500",
  ERROR: "bg-red-500",
};

function getModelName(modelId: string): string {
  const model = AVAILABLE_MODELS.find((m) => m.id === modelId);
  return model?.name || modelId;
}

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAgents() {
      try {
        const response = await fetch("/api/agents");
        if (!response.ok) {
          throw new Error("Failed to fetch agents");
        }
        const data = await response.json();
        setAgents(data.data || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    }

    fetchAgents();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <p>Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-destructive">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Agents</h1>
          <p className="text-muted-foreground">
            Configure and manage OpenClaw agents
          </p>
        </div>
        <Link href="/agents/new">
          <Button>Add Agent</Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Agents</CardTitle>
          <CardDescription>
            A list of all configured agents with their status and model
          </CardDescription>
        </CardHeader>
        <CardContent>
          {agents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No agents found. Add your first agent to get started.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead>Enabled</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {agents.map((agent) => (
                  <TableRow key={agent.id}>
                    <TableCell className="font-medium">
                      <Link
                        href={`/agents/${agent.id}`}
                        className="hover:underline"
                      >
                        {agent.name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={`${statusColors[agent.status]} text-white`}
                      >
                        {agent.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{getModelName(agent.model)}</TableCell>
                    <TableCell>
                      <Badge variant={agent.enabled ? "default" : "secondary"}>
                        {agent.enabled ? "Enabled" : "Disabled"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(agent.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/agents/${agent.id}`}>
                        <Button variant="ghost" size="sm">
                          Configure
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
