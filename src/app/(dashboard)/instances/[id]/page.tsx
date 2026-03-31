"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { Instance } from "@/types";
import type { InstanceStatus } from "@prisma/client";

const statusColors: Record<InstanceStatus, string> = {
  ONLINE: "bg-green-500",
  OFFLINE: "bg-gray-500",
  STARTING: "bg-yellow-500",
  STOPPING: "bg-yellow-500",
  ERROR: "bg-red-500",
};

export default function InstanceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [instance, setInstance] = useState<Instance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchInstance() {
      try {
        const response = await fetch(`/api/instances/${params.id}`);
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error("Instance not found");
          }
          throw new Error("Failed to fetch instance");
        }
        const data = await response.json();
        setInstance(data.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    }

    if (params.id) {
      fetchInstance();
    }
  }, [params.id]);

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

  if (!instance) {
    return (
      <div className="flex items-center justify-center p-8">
        <p>Instance not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{instance.name}</h1>
          <p className="text-muted-foreground">
            {instance.description || "No description"}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.back()}>
            Back
          </Button>
          <Button variant="destructive">Delete</Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Instance Details</CardTitle>
          <CardDescription>
            Configuration and status information
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Status</span>
            <Badge className={`${statusColors[instance.status]} text-white`}>
              {instance.status}
            </Badge>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Gateway URL</span>
            <span className="font-mono text-sm">{instance.gatewayUrl}</span>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Instance ID</span>
            <span className="font-mono text-sm">{instance.id}</span>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Created At</span>
            <span className="text-sm">
              {new Date(instance.createdAt).toLocaleString()}
            </span>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Last Updated</span>
            <span className="text-sm">
              {new Date(instance.updatedAt).toLocaleString()}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
