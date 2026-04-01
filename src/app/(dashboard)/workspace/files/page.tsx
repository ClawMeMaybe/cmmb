"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Home, RefreshCw, ChevronRight } from "lucide-react";
import { FileTree } from "@/components/workspace/file-tree";
import { FileEditor } from "@/components/workspace/file-editor";
import type { WorkspaceFile, WorkspaceFileContent } from "@/types/workspace";

export default function WorkspaceFilesPage() {
  const [files, setFiles] = useState<WorkspaceFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPath, setCurrentPath] = useState("");
  const [selectedFile, setSelectedFile] = useState<WorkspaceFile | null>(null);
  const [fileContent, setFileContent] = useState<WorkspaceFileContent | null>(
    null
  );
  const [loadingContent, setLoadingContent] = useState(false);

  const fetchFiles = useCallback(async (path: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/workspace/files?path=${encodeURIComponent(path)}`
      );
      if (!response.ok) {
        throw new Error("Failed to fetch files");
      }
      const data = await response.json();
      setFiles(data.data || []);
      setCurrentPath(path);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFiles("");
  }, [fetchFiles]);

  const fetchFileContent = async (file: WorkspaceFile) => {
    setLoadingContent(true);
    try {
      const response = await fetch(
        `/api/workspace/files/${encodeURIComponent(file.path)}`
      );
      if (!response.ok) {
        throw new Error("Failed to fetch file content");
      }
      const data = await response.json();
      setFileContent(data.data);
      setSelectedFile(file);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoadingContent(false);
    }
  };

  const saveFileContent = async (content: string) => {
    if (!fileContent) return;
    try {
      const response = await fetch(
        `/api/workspace/files/${encodeURIComponent(fileContent.path)}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content }),
        }
      );
      if (!response.ok) {
        throw new Error("Failed to save file");
      }
      const data = await response.json();
      setFileContent(data.data);
    } catch (err) {
      throw err;
    }
  };

  const pathSegments = currentPath.split("/").filter(Boolean);

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Workspace Files
            </h1>
            <p className="text-muted-foreground">
              Browse and edit OpenClaw workspace configuration files
            </p>
          </div>
          <Button variant="outline" onClick={() => fetchFiles(currentPath)}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
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
          <h1 className="text-3xl font-bold tracking-tight inline">Files</h1>
        </div>
        <Button
          variant="outline"
          onClick={() => fetchFiles(currentPath)}
          disabled={loading}
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* File Tree */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">File Browser</CardTitle>
            {/* Breadcrumb */}
            <div className="flex items-center gap-1 text-sm overflow-x-auto">
              <Button
                size="sm"
                variant="ghost"
                className="px-1"
                onClick={() => fetchFiles("")}
              >
                <Home className="h-4 w-4" />
              </Button>
              {pathSegments.map((segment, index) => (
                <span key={index} className="flex items-center gap-1">
                  <ChevronRight className="h-3 w-3" />
                  <Button
                    size="sm"
                    variant="ghost"
                    className="px-1"
                    onClick={() =>
                      fetchFiles(pathSegments.slice(0, index + 1).join("/"))
                    }
                  >
                    {segment}
                  </Button>
                </span>
              ))}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-4">Loading...</div>
            ) : (
              <FileTree
                files={files}
                onSelectFile={fetchFileContent}
                selectedPath={selectedFile?.path}
              />
            )}
          </CardContent>
        </Card>

        {/* File Editor */}
        <Card className="lg:col-span-2 min-h-[500px]">
          <CardContent className="p-4 h-full">
            {loadingContent ? (
              <div className="flex items-center justify-center h-full">
                <p>Loading file content...</p>
              </div>
            ) : fileContent ? (
              <FileEditor
                file={fileContent}
                onSave={saveFileContent}
                onClose={() => {
                  setFileContent(null);
                  setSelectedFile(null);
                }}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <p>Select a file from the browser to view or edit</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
