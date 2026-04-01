"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import type { Tag, Instance } from "@/types";

interface BulkTagDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  instances: Instance[];
  tags: Tag[];
  onComplete: () => void;
}

export function BulkTagDialog({
  open,
  onOpenChange,
  instances,
  tags,
  onComplete,
}: BulkTagDialogProps) {
  const [selectedInstances, setSelectedInstances] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [action, setAction] = useState<"add" | "remove">("add");
  const [saving, setSaving] = useState(false);

  const handleInstanceToggle = (instanceId: string) => {
    if (selectedInstances.includes(instanceId)) {
      setSelectedInstances(selectedInstances.filter((id) => id !== instanceId));
    } else {
      setSelectedInstances([...selectedInstances, instanceId]);
    }
  };

  const handleTagToggle = (tagId: string) => {
    if (selectedTags.includes(tagId)) {
      setSelectedTags(selectedTags.filter((id) => id !== tagId));
    } else {
      setSelectedTags([...selectedTags, tagId]);
    }
  };

  const handleSelectAllInstances = () => {
    if (selectedInstances.length === instances.length) {
      setSelectedInstances([]);
    } else {
      setSelectedInstances(instances.map((i) => i.id));
    }
  };

  const handleSelectAllTags = () => {
    if (selectedTags.length === tags.length) {
      setSelectedTags([]);
    } else {
      setSelectedTags(tags.map((t) => t.id));
    }
  };

  const handleSubmit = async () => {
    if (selectedInstances.length === 0 || selectedTags.length === 0) {
      return;
    }

    setSaving(true);
    try {
      const response = await fetch("/api/instances/bulk-tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instanceIds: selectedInstances,
          tagIds: selectedTags,
          action,
        }),
      });

      if (response.ok) {
        setSelectedInstances([]);
        setSelectedTags([]);
        onComplete();
        onOpenChange(false);
      } else {
        const data = await response.json();
        console.error("Bulk tag operation failed:", data.error);
      }
    } catch (error) {
      console.error("Bulk tag operation error:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setSelectedInstances([]);
      setSelectedTags([]);
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bulk Tag Operation</DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          <div className="space-y-2">
            <Label>Action</Label>
            <div className="flex gap-2">
              <Button
                variant={action === "add" ? "default" : "outline"}
                size="sm"
                onClick={() => setAction("add")}
              >
                Add Tags
              </Button>
              <Button
                variant={action === "remove" ? "default" : "outline"}
                size="sm"
                onClick={() => setAction("remove")}
              >
                Remove Tags
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>
                Select Instances ({selectedInstances.length} selected)
              </Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSelectAllInstances}
              >
                {selectedInstances.length === instances.length
                  ? "Deselect all"
                  : "Select all"}
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-2 border rounded-md p-3 max-h-48 overflow-y-auto">
              {instances.map((instance) => (
                <div key={instance.id} className="flex items-center gap-2">
                  <Checkbox
                    id={`instance-${instance.id}`}
                    checked={selectedInstances.includes(instance.id)}
                    onCheckedChange={() => handleInstanceToggle(instance.id)}
                  />
                  <Label
                    htmlFor={`instance-${instance.id}`}
                    className="cursor-pointer truncate"
                  >
                    {instance.name}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Select Tags ({selectedTags.length} selected)</Label>
              <Button variant="ghost" size="sm" onClick={handleSelectAllTags}>
                {selectedTags.length === tags.length
                  ? "Deselect all"
                  : "Select all"}
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 border rounded-md p-3 max-h-48 overflow-y-auto">
              {tags.map((tag) => (
                <div key={tag.id} className="flex items-center gap-2">
                  <Checkbox
                    id={`tag-${tag.id}`}
                    checked={selectedTags.includes(tag.id)}
                    onCheckedChange={() => handleTagToggle(tag.id)}
                  />
                  <Badge
                    style={{ backgroundColor: tag.color }}
                    className="cursor-pointer"
                  >
                    {tag.name}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              saving ||
              selectedInstances.length === 0 ||
              selectedTags.length === 0
            }
          >
            {saving
              ? "Processing..."
              : `${action === "add" ? "Add" : "Remove"} ${
                  selectedTags.length
                } tags to ${selectedInstances.length} instances`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
