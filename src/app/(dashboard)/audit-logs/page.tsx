"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

interface AuditLogItem {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  details: Record<string, unknown> | null;
  createdAt: string;
  userId: string;
  instanceId: string | null;
  user: {
    id: string;
    email: string;
    name: string | null;
  };
}

interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

const ACTION_COLORS: Record<string, string> = {
  LOGIN: "bg-green-500",
  LOGOUT: "bg-gray-500",
  LOGIN_FAILED: "bg-red-500",
  CREATE_INSTANCE: "bg-blue-500",
  UPDATE_INSTANCE: "bg-yellow-500",
  DELETE_INSTANCE: "bg-red-500",
  START_INSTANCE: "bg-green-500",
  STOP_INSTANCE: "bg-orange-500",
  RESTART_INSTANCE: "bg-purple-500",
};

const ENTITY_TYPE_COLORS: Record<string, string> = {
  User: "bg-indigo-500",
  Instance: "bg-cyan-500",
  Session: "bg-pink-500",
};

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    pageSize: 50,
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actions, setActions] = useState<string[]>([]);

  // Filters
  const [filterAction, setFilterAction] = useState<string>("");
  const [filterEntityType, setFilterEntityType] = useState<string>("");
  const [filterStartDate, setFilterStartDate] = useState<string>("");
  const [filterEndDate, setFilterEndDate] = useState<string>("");

  const fetchActions = useCallback(async () => {
    try {
      const response = await fetch("/api/audit-logs?actions=true");
      if (response.ok) {
        const data = await response.json();
        setActions(data.actions || []);
      }
    } catch (err) {
      console.error("Failed to fetch actions:", err);
    }
  }, []);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.set("page", String(pagination.page));
      params.set("pageSize", String(pagination.pageSize));

      if (filterAction) params.set("action", filterAction);
      if (filterEntityType) params.set("entityType", filterEntityType);
      if (filterStartDate) params.set("startDate", filterStartDate);
      if (filterEndDate) params.set("endDate", filterEndDate);

      const response = await fetch(`/api/audit-logs?${params.toString()}`);

      if (!response.ok) {
        throw new Error("Failed to fetch audit logs");
      }

      const data = await response.json();
      setLogs(data.data?.logs || []);
      setPagination((prev) => ({
        ...prev,
        ...data.data?.pagination,
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, [
    pagination.page,
    pagination.pageSize,
    filterAction,
    filterEntityType,
    filterStartDate,
    filterEndDate,
  ]);

  useEffect(() => {
    fetchActions();
  }, [fetchActions]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handlePageChange = (newPage: number) => {
    setPagination((prev) => ({ ...prev, page: newPage }));
  };

  const handleApplyFilters = () => {
    setPagination((prev) => ({ ...prev, page: 1 }));
    fetchLogs();
  };

  const handleClearFilters = () => {
    setFilterAction("");
    setFilterEntityType("");
    setFilterStartDate("");
    setFilterEndDate("");
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const formatDetails = (details: Record<string, unknown> | null): string => {
    if (!details) return "-";
    return JSON.stringify(details, null, 2);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Audit Logs</h1>
        <p className="text-muted-foreground">
          View all admin actions and system events
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>
            Filter audit logs by action type, entity, and date range
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <div className="space-y-2">
              <label className="text-sm font-medium">Action</label>
              <Select
                value={filterAction}
                onValueChange={(value) => setFilterAction(value ?? "")}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All actions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All actions</SelectItem>
                  {actions.map((action) => (
                    <SelectItem key={action} value={action}>
                      {action}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Entity Type</label>
              <Select
                value={filterEntityType}
                onValueChange={(value) => setFilterEntityType(value ?? "")}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All entities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All entities</SelectItem>
                  <SelectItem value="User">User</SelectItem>
                  <SelectItem value="Instance">Instance</SelectItem>
                  <SelectItem value="Session">Session</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Start Date</label>
              <Input
                type="date"
                value={filterStartDate}
                onChange={(e) => setFilterStartDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">End Date</label>
              <Input
                type="date"
                value={filterEndDate}
                onChange={(e) => setFilterEndDate(e.target.value)}
              />
            </div>

            <div className="flex items-end gap-2">
              <Button onClick={handleApplyFilters}>Apply</Button>
              <Button variant="outline" onClick={handleClearFilters}>
                Clear
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Activity Log</CardTitle>
          <CardDescription>
            Showing {logs.length} of {pagination.total} entries (Page{" "}
            {pagination.page} of {pagination.totalPages})
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <p>Loading...</p>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center p-8">
              <p className="text-destructive">{error}</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No audit logs found.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-sm">
                      {new Date(log.createdAt).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">
                          {log.user.name || log.user.email}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {log.user.email}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={`${
                          ACTION_COLORS[log.action] || "bg-gray-500"
                        } text-white`}
                      >
                        {log.action}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <Badge
                          className={`${
                            ENTITY_TYPE_COLORS[log.entityType] || "bg-gray-500"
                          } text-white`}
                        >
                          {log.entityType}
                        </Badge>
                        <span className="text-xs font-mono text-muted-foreground">
                          {log.entityId.substring(0, 8)}...
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <pre className="text-xs max-w-xs overflow-auto bg-muted p-2 rounded">
                        {formatDetails(log.details)}
                      </pre>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                Page {pagination.page} of {pagination.totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page <= 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page >= pagination.totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
