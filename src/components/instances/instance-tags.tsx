"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Plus, X } from "lucide-react";
import type { Tag, InstanceTag } from "@/types";

interface InstanceTagsProps {
  instanceId: string;
  initialTags?: (InstanceTag & { tag: Tag })[];
}

export function InstanceTags({ instanceId, initialTags }: InstanceTagsProps) {
  const [instanceTags, setInstanceTags] = useState<
    (InstanceTag & { tag: Tag })[]
  >(initialTags || []);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(!initialTags);
  const [open, setOpen] = useState(false);
  const [addingTagId, setAddingTagId] = useState<string | null>(null);

  useEffect(() => {
    if (!initialTags) {
      fetchInstanceTags();
    }
    fetchAllTags();
  }, [instanceId, initialTags]);

  const fetchInstanceTags = async () => {
    try {
      const response = await fetch(`/api/instances/${instanceId}/tags`);
      if (response.ok) {
        const data = await response.json();
        setInstanceTags(data.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch instance tags:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllTags = async () => {
    try {
      const response = await fetch("/api/tags");
      if (response.ok) {
        const data = await response.json();
        setAllTags(data.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch tags:", error);
    }
  };

  const handleAddTag = async (tagId: string) => {
    setAddingTagId(tagId);
    try {
      const response = await fetch(`/api/instances/${instanceId}/tags`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tagId }),
      });
      if (response.ok) {
        const data = await response.json();
        setInstanceTags([...instanceTags, data.data]);
        setOpen(false);
      }
    } catch (error) {
      console.error("Failed to add tag:", error);
    } finally {
      setAddingTagId(null);
    }
  };

  const handleRemoveTag = async (tagId: string) => {
    try {
      const response = await fetch(
        `/api/instances/${instanceId}/tags/${tagId}`,
        {
          method: "DELETE",
        }
      );
      if (response.ok) {
        setInstanceTags(instanceTags.filter((it) => it.tagId !== tagId));
      }
    } catch (error) {
      console.error("Failed to remove tag:", error);
    }
  };

  const availableTags = allTags.filter(
    (tag) => !instanceTags.some((it) => it.tagId === tag.id)
  );

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading tags...</p>;
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {instanceTags.map((instanceTag) => (
        <Badge
          key={instanceTag.tagId}
          style={{ backgroundColor: instanceTag.tag.color }}
          className="cursor-pointer group"
        >
          {instanceTag.tag.name}
          <X
            className="ml-1 h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={() => handleRemoveTag(instanceTag.tagId)}
          />
        </Badge>
      ))}
      {availableTags.length > 0 && (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger>
            <Button variant="outline" size="sm" className="h-6 px-2">
              <Plus className="h-3 w-3" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64" align="start">
            <div className="space-y-4">
              <h4 className="font-medium">Add Tag</h4>
              <div className="space-y-2">
                {availableTags.map((tag) => (
                  <div key={tag.id} className="flex items-center gap-2">
                    <Checkbox
                      id={`add-${tag.id}`}
                      checked={addingTagId === tag.id}
                      onCheckedChange={() => handleAddTag(tag.id)}
                      disabled={addingTagId !== null}
                    />
                    <Label
                      htmlFor={`add-${tag.id}`}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <Badge
                        style={{ backgroundColor: tag.color }}
                        className="text-xs"
                      >
                        {tag.name}
                      </Badge>
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </PopoverContent>
        </Popover>
      )}
      {allTags.length === 0 && (
        <p className="text-sm text-muted-foreground">No tags available</p>
      )}
    </div>
  );
}
