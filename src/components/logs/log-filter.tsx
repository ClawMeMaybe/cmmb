"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { LogLevel, LogSource, LogFilterState } from "@/types/logs";
import { DEFAULT_LOG_LEVELS } from "@/types/logs";

interface LogFilterProps {
  filterState: LogFilterState;
  onFilterChange: (state: LogFilterState) => void;
  instances?: { id: string; name: string }[];
}

const LOG_LEVELS: LogLevel[] = ["error", "warn", "info", "debug"];

/**
 * Log filter component for filtering by level, source, and instance
 */
export function LogFilter({
  filterState,
  onFilterChange,
  instances = [],
}: LogFilterProps) {
  const handleLevelChange = (level: LogLevel, checked: boolean) => {
    const newLevels = checked
      ? [...filterState.levels, level]
      : filterState.levels.filter((l) => l !== level);

    onFilterChange({
      ...filterState,
      levels: newLevels.length > 0 ? newLevels : DEFAULT_LOG_LEVELS,
    });
  };

  const handleSourceChange = (value: string | null) => {
    if (!value) return;
    onFilterChange({
      ...filterState,
      source: value === "all" ? undefined : (value as LogSource),
    });
  };

  const handleInstanceChange = (value: string | null) => {
    if (!value) return;
    onFilterChange({
      ...filterState,
      instanceId: value === "all" ? undefined : value,
    });
  };

  return (
    <div className="flex flex-wrap gap-4 items-center">
      {/* Log Level Filters */}
      <div className="flex gap-2 items-center">
        <span className="text-sm font-medium text-muted-foreground">
          Level:
        </span>
        {LOG_LEVELS.map((level) => (
          <div key={level} className="flex items-center gap-1">
            <Checkbox
              id={`level-${level}`}
              checked={filterState.levels.includes(level)}
              onCheckedChange={(checked) =>
                handleLevelChange(level, checked as boolean)
              }
            />
            <Label
              htmlFor={`level-${level}`}
              className="text-sm cursor-pointer"
            >
              {level.charAt(0).toUpperCase() + level.slice(1)}
            </Label>
          </div>
        ))}
      </div>

      {/* Source Filter */}
      <div className="flex gap-2 items-center">
        <span className="text-sm font-medium text-muted-foreground">
          Source:
        </span>
        <Select
          value={filterState.source ?? "all"}
          onValueChange={handleSourceChange}
        >
          <SelectTrigger className="w-[120px]">
            <SelectValue placeholder="All sources" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="gateway">Gateway</SelectItem>
            <SelectItem value="agent">Agent</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Instance Filter */}
      {instances.length > 0 && (
        <div className="flex gap-2 items-center">
          <span className="text-sm font-medium text-muted-foreground">
            Instance:
          </span>
          <Select
            value={filterState.instanceId ?? "all"}
            onValueChange={handleInstanceChange}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All instances" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Instances</SelectItem>
              {instances.map((instance) => (
                <SelectItem key={instance.id} value={instance.id}>
                  {instance.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}
