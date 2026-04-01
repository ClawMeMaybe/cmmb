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
import { Checkbox } from "@/components/ui/checkbox";
import { TagFilter } from "@/components/instances/tag-filter";
import { BulkTagDialog } from "@/components/instances/bulk-tag-dialog";
import { Tags, Edit2 } from "lucide-react";
import type { Tag } from "@/types";
import type { InstanceStatus } from "@prisma/client";
import type { InstanceWithTags } from "@/server/instances";

const statusColors: Record<InstanceStatus, string> = {
  ONLINE: "bg-green-500",
  OFFLINE: "bg-gray-500",
  STARTING: "bg-yellow-500",
  STOPPING: "bg-yellow-500",
  ERROR: "bg-red-500",
};

export default function InstancesPage() {
  const [instances, setInstances] = useState<InstanceWithTags[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedInstances, setSelectedInstances] = useState<string[]>([]);
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);

  useEffect(() => {
    fetchTags();
  }, []);

  useEffect(() => {
    fetchInstances();
  }, [selectedTagIds]);

  const fetchTags = async () => {
    try {
      const response = await fetch("/api/tags");
      if (response.ok) {
        const data = await response.json();
        setTags(data.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch tags:", error);
    }
  };

  const fetchInstances = async () => {
    try {
      setLoading(true);
      const url =
        selectedTagIds.length > 0
          ? `/api/instances?tags=${selectedTagIds.join(",")}`
          : "/api/instances";
      const response = await fetch(url);
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
  };

  const handleInstanceToggle = (instanceId: string) => {
    if (selectedInstances.includes(instanceId)) {
      setSelectedInstances(selectedInstances.filter((id) => id !== instanceId));
    } else {
      setSelectedInstances([...selectedInstances, instanceId]);
    }
  };

  const handleSelectAll = () => {
    if (selectedInstances.length === instances.length) {
      setSelectedInstances([]);
    } else {
      setSelectedInstances(instances.map((i) => i.id));
    }
  };

  const handleBulkComplete = () => {
    setSelectedInstances([]);
    fetchInstances();
  };

  if (loading && instances.length === 0) {
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
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All Instances</CardTitle>
              <CardDescription>
                A list of all registered OpenClaw instances
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <TagFilter
                selectedTagIds={selectedTagIds}
                onSelectionChange={setSelectedTagIds}
              />
              {tags.length > 0 && selectedInstances.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setBulkDialogOpen(true)}
                >
                  <Tags className="mr-2 h-4 w-4" />
                  Bulk Tag ({selectedInstances.length})
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {instances.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {selectedTagIds.length > 0
                ? "No instances found with the selected tags."
                : "No instances found. Add your first instance to get started."}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedInstances.length === instances.length}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Tags</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Gateway URL</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {instances.map((instance) => (
                  <TableRow key={instance.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedInstances.includes(instance.id)}
                        onCheckedChange={() =>
                          handleInstanceToggle(instance.id)
                        }
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      <Link
                        href={`/instances/${instance.id}`}
                        className="hover:underline"
                      >
                        {instance.name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 flex-wrap">
                        {instance.tags.map((instanceTag) => (
                          <Badge
                            key={instanceTag.tagId}
                            style={{ backgroundColor: instanceTag.tag.color }}
                          >
                            {instanceTag.tag.name}
                          </Badge>
                        ))}
                      </div>
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
                          <Edit2 className="h-4 w-4" />
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

      <BulkTagDialog
        open={bulkDialogOpen}
        onOpenChange={setBulkDialogOpen}
        instances={instances}
        tags={tags}
        onComplete={handleBulkComplete}
      />
    </div>
  );
}
