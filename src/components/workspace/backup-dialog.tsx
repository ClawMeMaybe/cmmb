"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface BackupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (data: { name?: string; description?: string }) => Promise<void>;
  title: string;
  description: string;
  confirmText: string;
  mode: "create" | "restore";
  warning?: string;
}

export function BackupDialog({
  open,
  onOpenChange,
  onCreate,
  title,
  description,
  confirmText,
  mode,
  warning,
}: BackupDialogProps) {
  const [name, setName] = useState("");
  const [descriptionText, setDescriptionText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      await onCreate({
        name: name || undefined,
        description: descriptionText || undefined,
      });
      onOpenChange(false);
      setName("");
      setDescriptionText("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {warning && (
          <Alert variant="destructive">
            <AlertDescription>{warning}</AlertDescription>
          </Alert>
        )}

        {mode === "create" && (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">
                Backup Name (optional)
              </label>
              <Input
                placeholder="e.g., before-update-2026-04-01"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">
                Description (optional)
              </label>
              <Input
                placeholder="e.g., Backup before updating workspace config"
                value={descriptionText}
                onChange={(e) => setDescriptionText(e.target.value)}
              />
            </div>
          </div>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Processing..." : confirmText}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default BackupDialog;
