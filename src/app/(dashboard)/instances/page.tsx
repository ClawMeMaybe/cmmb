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
import type { Instance } from "@/types";
import type { InstanceStatus } from "@prisma/client";

const statusColors: Record<InstanceStatus, string> = {
  ONLINE: "bg-green-500",
  OFFLINE: "bg-gray-500",
  STARTING: "bg-yellow-500",
  STOPPING: "bg-yellow-500",
  ERROR: "bg-red-500",
};

export default function InstancesPage() {
  const [instances, setInstances] = useState<Instance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchInstances() {
      try {
        const response = await fetch("/api/instances");
        if (!response.ok) {
          throw new Error("Failed to fetch instances");
        }
        const data = await response.json();
        setInstances(data.data || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    }

    fetchInstances();
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
          <h1 className="text-3xl font-bold tracking-tight">Instances</h1>
          <p className="text-muted-foreground">
            Manage your OpenClaw instances
          </p>
        </div>
        <Link href="/instances/new">
          <Button>Add Instance</Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Instances</CardTitle>
          <CardDescription>
            A list of all registered OpenClaw instances
          </CardDescription>
        </CardHeader>
        <CardContent>
          {instances.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No instances found. Add your first instance to get started.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Gateway URL</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {instances.map((instance) => (
                  <TableRow key={instance.id}>
                    <TableCell className="font-medium">
                      <Link
                        href={`/instances/${instance.id}`}
                        className="hover:underline"
                      >
                        {instance.name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={`${statusColors[instance.status]} text-white`}
                      >
                        {instance.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {instance.gatewayUrl}
                    </TableCell>
                    <TableCell>
                      {new Date(instance.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/instances/${instance.id}`}>
                        <Button variant="ghost" size="sm">
                          View
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
