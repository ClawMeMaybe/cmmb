"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FolderOpen, Brain, Archive } from "lucide-react";
import type { WorkspaceStats } from "@/types/workspace";

export default function WorkspacePage() {
  const [stats, setStats] = useState<WorkspaceStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStats() {
      try {
        const response = await fetch("/api/workspace/files?stats=true");
        if (!response.ok) {
          throw new Error("Failed to fetch workspace stats");
        }
        const data = await response.json();
        setStats(data.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
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

  const menuItems = [
    {
      href: "/workspace/files",
      label: "Files",
      description: "Browse and edit workspace configuration files",
      icon: FolderOpen,
      stats: stats ? `${stats.totalFiles} files` : null,
    },
    {
      href: "/workspace/memory",
      label: "Memory",
      description: "Manage memory entries for context persistence",
      icon: Brain,
      stats: stats ? `${stats.memoryEntries} entries` : null,
    },
    {
      href: "/workspace/backups",
      label: "Backups",
      description: "Create and restore workspace backups",
      icon: Archive,
      stats: stats ? `${stats.backupsCount} backups` : null,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Workspace</h1>
        <p className="text-muted-foreground">
          Manage OpenClaw workspace configuration, memory, and backups
        </p>
      </div>

      {stats && (
        <Card>
          <CardHeader>
            <CardTitle>Workspace Overview</CardTitle>
            <CardDescription>Current workspace statistics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Total Files</p>
                <p className="text-2xl font-bold">{stats.totalFiles}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Directories</p>
                <p className="text-2xl font-bold">{stats.totalDirectories}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Memory Entries</p>
                <p className="text-2xl font-bold">{stats.memoryEntries}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Backups</p>
                <p className="text-2xl font-bold">{stats.backupsCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {menuItems.map((item) => (
          <Link key={item.href} href={item.href}>
            <Card className="hover:border-primary/50 transition-colors cursor-pointer">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <item.icon className="h-8 w-8 text-muted-foreground" />
                  <div>
                    <CardTitle className="text-lg">{item.label}</CardTitle>
                    {item.stats && (
                      <p className="text-sm text-muted-foreground">
                        {item.stats}
                      </p>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {item.description}
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
