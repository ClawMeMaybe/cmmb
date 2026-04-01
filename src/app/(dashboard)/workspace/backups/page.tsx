"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RefreshCw, Plus, RotateCcw, Trash2 } from "lucide-react";
import { BackupDialog } from "@/components/workspace/backup-dialog";
import type { WorkspaceBackup } from "@prisma/client";

interface BackupWithUser extends WorkspaceBackup {
  createdBy?: {
    id: string;
    name: string | null;
    email: string;
  };
}

export default function WorkspaceBackupsPage() {
  const [backups, setBackups] = useState<BackupWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showRestore, setShowRestore] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchBackups = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/workspace/backups");
      if (!response.ok) {
        throw new Error("Failed to fetch backups");
      }
      const data = await response.json();
      setBackups(data.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBackups();
  }, []);

  const handleCreate = async (data: {
    name?: string;
    description?: string;
  }) => {
    const response = await fetch("/api/workspace/backups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const respData = await response.json();
      throw new Error(respData.error || "Failed to create backup");
    }
    await fetchBackups();
  };

  const handleRestore = async (id: string) => {
    setProcessingId(id);
    try {
      const response = await fetch(`/api/workspace/backups/${id}/restore`, {
        method: "POST",
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to restore backup");
      }
      await fetchBackups();
      setShowRestore(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setProcessingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    setProcessingId(id);
    try {
      const response = await fetch(`/api/workspace/backups/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete backup");
      }
      await fetchBackups();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setProcessingId(null);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

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
          <h1 className="text-3xl font-bold tracking-tight inline">Backups</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchBackups} disabled={loading}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Backup
          </Button>
        </div>
      </div>

      {error && (
        <Card>
          <CardContent className="py-4">
            <p className="text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Workspace Backups</CardTitle>
          <p className="text-sm text-muted-foreground">
            Create, restore, and manage workspace configuration backups
          </p>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p>Loading...</p>
          ) : backups.length === 0 ? (
            <p className="text-muted-foreground">
              No backups found. Create a backup to preserve your workspace
              state.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Created By</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {backups.map((backup) => (
                  <TableRow key={backup.id}>
                    <TableCell className="font-medium">{backup.name}</TableCell>
                    <TableCell>
                      {backup.description || (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{formatSize(backup.size)}</Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(backup.createdAt).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      {backup.createdBy?.name || backup.createdBy?.email || "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setShowRestore(backup.id)}
                          disabled={processingId === backup.id}
                        >
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDelete(backup.id)}
                          disabled={processingId === backup.id}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Backup Dialog */}
      <BackupDialog
        open={showCreate}
        onOpenChange={setShowCreate}
        onCreate={handleCreate}
        title="Create Backup"
        description="Create a new backup of your workspace configuration"
        confirmText="Create Backup"
        mode="create"
      />

      {/* Restore Backup Dialog */}
      <BackupDialog
        open={!!showRestore}
        onOpenChange={(open) => setShowRestore(open ? showRestore : null)}
        onCreate={async () => {
          if (showRestore) await handleRestore(showRestore);
        }}
        title="Restore Backup"
        description="Restore workspace from this backup. A pre-restore backup will be created automatically."
        confirmText="Restore"
        mode="restore"
        warning="This will overwrite your current workspace configuration. Make sure you have a recent backup."
      />
    </div>
  );
}
