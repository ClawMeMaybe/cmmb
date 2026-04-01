"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { RefreshCw, Plus } from "lucide-react";
import { MemoryCard } from "@/components/workspace/memory-card";
import type { MemoryEntry, MemoryType } from "@/types/workspace";

export default function WorkspaceMemoryPage() {
  const [entries, setEntries] = useState<MemoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newEntry, setNewEntry] = useState({
    name: "",
    type: "project" as MemoryType,
    description: "",
    content: "",
  });

  const fetchEntries = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/workspace/memory");
      if (!response.ok) {
        throw new Error("Failed to fetch memory entries");
      }
      const data = await response.json();
      setEntries(data.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEntries();
  }, []);

  const handleCreate = async () => {
    if (!newEntry.name || !newEntry.content) {
      setError("Name and content are required");
      return;
    }
    setCreating(true);
    try {
      const response = await fetch("/api/workspace/memory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newEntry),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create memory entry");
      }
      await fetchEntries();
      setShowCreate(false);
      setNewEntry({ name: "", type: "project", description: "", content: "" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setCreating(false);
    }
  };

  const handleUpdate = async (
    name: string,
    data: { content: string; description?: string }
  ) => {
    const response = await fetch(
      `/api/workspace/memory/${encodeURIComponent(name)}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }
    );
    if (!response.ok) {
      throw new Error("Failed to update memory entry");
    }
    await fetchEntries();
  };

  const handleDelete = async (name: string) => {
    const response = await fetch(
      `/api/workspace/memory/${encodeURIComponent(name)}`,
      {
        method: "DELETE",
      }
    );
    if (!response.ok) {
      throw new Error("Failed to delete memory entry");
    }
    await fetchEntries();
  };

  if (error && !entries.length) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Link
              href="/workspace"
              className="text-muted-foreground hover:text-foreground"
            >
              Workspace
            </Link>
            <span className="mx-2">/</span>
            <h1 className="text-3xl font-bold tracking-tight inline">Memory</h1>
          </div>
        </div>
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-destructive">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/workspace"
            className="text-muted-foreground hover:text-foreground"
          >
            Workspace
          </Link>
          <span className="mx-2">/</span>
          <h1 className="text-3xl font-bold tracking-tight inline">Memory</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchEntries} disabled={loading}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Entry
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Memory Entries</CardTitle>
          <p className="text-sm text-muted-foreground">
            Memory entries store context that persists across conversations
          </p>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p>Loading...</p>
          ) : entries.length === 0 ? (
            <p className="text-muted-foreground">
              No memory entries found. Create a new entry to get started.
            </p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {entries.map((entry) => (
                <MemoryCard
                  key={entry.name}
                  entry={entry}
                  onUpdate={handleUpdate}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Memory Entry</DialogTitle>
            <DialogDescription>
              Add a new memory entry for context persistence
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Name</label>
              <Input
                placeholder="e.g., architecture-decisions"
                value={newEntry.name}
                onChange={(e) =>
                  setNewEntry({ ...newEntry, name: e.target.value })
                }
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Type</label>
              <select
                className="w-full px-3 py-2 border rounded-md text-sm"
                value={newEntry.type}
                onChange={(e) =>
                  setNewEntry({
                    ...newEntry,
                    type: e.target.value as MemoryType,
                  })
                }
              >
                <option value="user">User</option>
                <option value="feedback">Feedback</option>
                <option value="project">Project</option>
                <option value="reference">Reference</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">
                Description (optional)
              </label>
              <Input
                placeholder="e.g., Architecture decisions for the project"
                value={newEntry.description}
                onChange={(e) =>
                  setNewEntry({ ...newEntry, description: e.target.value })
                }
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Content</label>
              <textarea
                className="w-full px-3 py-2 border rounded-md text-sm font-mono min-h-[200px]"
                placeholder="Enter memory content..."
                value={newEntry.content}
                onChange={(e) =>
                  setNewEntry({ ...newEntry, content: e.target.value })
                }
              />
            </div>
            {error && <p className="text-destructive text-sm">{error}</p>}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowCreate(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={creating}>
                {creating ? "Creating..." : "Create"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
