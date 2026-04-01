"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Download } from "lucide-react";
import type { LogEntryResponse, LogExportFormat } from "@/types/logs";
import { exportLogs } from "@/lib/logs";

interface LogExportDialogProps {
  logs: LogEntryResponse[];
  disabled?: boolean;
}

const EXPORT_FORMATS: {
  value: LogExportFormat;
  label: string;
  description: string;
}[] = [
  { value: "json", label: "JSON", description: "Structured JSON format" },
  { value: "csv", label: "CSV", description: "Comma-separated values" },
  { value: "txt", label: "Text", description: "Plain text format" },
];

/**
 * Log export dialog for downloading logs in various formats
 */
export function LogExportDialog({
  logs,
  disabled = false,
}: LogExportDialogProps) {
  const [format, setFormat] = useState<LogExportFormat>("json");
  const [includeMetadata, setIncludeMetadata] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const handleExport = () => {
    if (logs.length === 0) return;

    const content = exportLogs(logs, format, includeMetadata);
    const mimeType =
      format === "json"
        ? "application/json"
        : format === "csv"
          ? "text/csv"
          : "text/plain";

    const extension = format === "txt" ? "txt" : format;
    const filename = `logs-${new Date().toISOString().slice(0, 10)}.${extension}`;

    // Create download link
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled || logs.length === 0}
        >
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Export Logs</DialogTitle>
          <DialogDescription>
            Download {logs.length} log entries in your preferred format.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {/* Format Selection */}
          <div className="grid gap-2">
            <Label htmlFor="format">Export Format</Label>
            <Select
              value={format}
              onValueChange={(v) => setFormat(v as LogExportFormat)}
            >
              <SelectTrigger id="format">
                <SelectValue placeholder="Select format" />
              </SelectTrigger>
              <SelectContent>
                {EXPORT_FORMATS.map((f) => (
                  <SelectItem key={f.value} value={f.value}>
                    {f.label} - {f.description}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Include Metadata */}
          <div className="flex items-center gap-2">
            <Checkbox
              id="metadata"
              checked={includeMetadata}
              onCheckedChange={(checked) =>
                setIncludeMetadata(checked as boolean)
              }
            />
            <Label htmlFor="metadata" className="cursor-pointer">
              Include metadata in export
            </Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleExport}>Download</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
