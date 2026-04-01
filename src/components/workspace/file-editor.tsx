"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Save, X } from "lucide-react";
import type { WorkspaceFileContent } from "@/types/workspace";

interface FileEditorProps {
  file: WorkspaceFileContent | null;
  onSave: (content: string) => Promise<void>;
  onClose: () => void;
}

export function FileEditor({ file, onSave, onClose }: FileEditorProps) {
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (file) {
      setContent(file.content);
      setHasChanges(false);
    }
  }, [file]);

  if (!file) {
    return null;
  }

  const handleChange = (value: string) => {
    setContent(value);
    setHasChanges(value !== file.content);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(content);
      setHasChanges(false);
    } catch (error) {
      console.error("Failed to save:", error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-full border rounded-lg">
      <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/50">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{file.path}</span>
          {hasChanges && (
            <span className="text-xs text-muted-foreground">(unsaved)</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={onClose}>
            <X className="h-4 w-4 mr-1" />
            Close
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={!hasChanges || saving}
          >
            <Save className="h-4 w-4 mr-1" />
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>
      <textarea
        className="flex-1 w-full p-4 text-sm font-mono resize-none focus:outline-none bg-background"
        value={content}
        onChange={(e) => handleChange(e.target.value)}
        spellCheck={false}
      />
    </div>
  );
}

export default FileEditor;
