"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Pencil, Trash2 } from "lucide-react";
import type { MemoryEntry, MemoryType } from "@/types/workspace";

interface MemoryCardProps {
  entry: MemoryEntry;
  onUpdate: (
    name: string,
    data: { content: string; description?: string }
  ) => Promise<void>;
  onDelete: (name: string) => Promise<void>;
}

const typeColors: Record<MemoryType, string> = {
  user: "bg-blue-500",
  feedback: "bg-yellow-500",
  project: "bg-green-500",
  reference: "bg-purple-500",
};

export function MemoryCard({ entry, onUpdate, onDelete }: MemoryCardProps) {
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(entry.content);
  const [editDescription, setEditDescription] = useState(entry.description);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showContent, setShowContent] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onUpdate(entry.name, {
        content: editContent,
        description: editDescription,
      });
      setEditing(false);
    } catch (error) {
      console.error("Failed to update:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await onDelete(entry.name);
    } catch (error) {
      console.error("Failed to delete:", error);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <Card className="hover:border-primary/50 transition-colors">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <CardTitle className="text-lg">{entry.name}</CardTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="text-xs">
                  <span
                    className={`w-2 h-2 rounded-full ${typeColors[entry.type]} mr-1`}
                  />
                  {entry.type}
                </Badge>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button
                size="icon"
                variant="ghost"
                onClick={() => {
                  setEditContent(entry.content);
                  setEditDescription(entry.description);
                  setEditing(true);
                }}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={handleDelete}
                disabled={deleting}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
          {entry.description && (
            <CardDescription className="line-clamp-2 mt-2">
              {entry.description}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="pb-4">
          <div className="text-xs text-muted-foreground mb-2">
            Updated: {new Date(entry.updatedAt).toLocaleString()}
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowContent(true)}
          >
            View Content
          </Button>
        </CardContent>
      </Card>

      {/* View Content Dialog */}
      <Dialog open={showContent} onOpenChange={setShowContent}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{entry.name}</DialogTitle>
            <DialogDescription>
              {entry.description || `Memory entry (${entry.type})`}
            </DialogDescription>
          </DialogHeader>
          <div className="bg-muted p-4 rounded-lg overflow-auto">
            <pre className="text-sm whitespace-pre-wrap break-words">
              {entry.content}
            </pre>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Edit: {entry.name}</DialogTitle>
            <DialogDescription>
              Update the memory entry content
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">
                Description
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 border rounded-md text-sm"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Content</label>
              <textarea
                className="w-full px-3 py-2 border rounded-md text-sm font-mono min-h-[300px]"
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditing(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default MemoryCard;
