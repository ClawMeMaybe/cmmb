"use client";

import { useState } from "react";
import { ChevronRight, ChevronDown, File, Folder } from "lucide-react";
import { cn } from "@/lib/utils";
import type { WorkspaceFile } from "@/types/workspace";

interface FileTreeProps {
  files: WorkspaceFile[];
  onSelectFile: (file: WorkspaceFile) => void;
  selectedPath?: string;
}

export function FileTree({ files, onSelectFile, selectedPath }: FileTreeProps) {
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set());

  const toggleDir = async (dir: WorkspaceFile) => {
    const newExpanded = new Set(expandedDirs);
    if (newExpanded.has(dir.path)) {
      newExpanded.delete(dir.path);
    } else {
      newExpanded.add(dir.path);
    }
    setExpandedDirs(newExpanded);
  };

  const sortedFiles = [...files].sort((a, b) => {
    if (a.type !== b.type) {
      return a.type === "directory" ? -1 : 1;
    }
    return a.name.localeCompare(b.name);
  });

  if (files.length === 0) {
    return (
      <div className="text-sm text-muted-foreground p-2">
        No files in this directory
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {sortedFiles.map((file) => {
        const isExpanded = expandedDirs.has(file.path);
        const isSelected = selectedPath === file.path;

        return (
          <div key={file.path}>
            <div
              className={cn(
                "flex items-center gap-1 px-2 py-1.5 rounded cursor-pointer hover:bg-muted",
                isSelected && "bg-primary/10 text-primary"
              )}
              onClick={() => {
                if (file.type === "directory") {
                  toggleDir(file);
                } else {
                  onSelectFile(file);
                }
              }}
            >
              {file.type === "directory" ? (
                <>
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 shrink-0" />
                  ) : (
                    <ChevronRight className="h-4 w-4 shrink-0" />
                  )}
                  <Folder className="h-4 w-4 shrink-0 text-blue-500" />
                </>
              ) : (
                <>
                  <span className="w-4" />
                  <File className="h-4 w-4 shrink-0 text-gray-500" />
                </>
              )}
              <span className="text-sm truncate">{file.name}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default FileTree;
