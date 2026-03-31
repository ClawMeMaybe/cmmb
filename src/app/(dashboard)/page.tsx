"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Activity,
  Server,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Plus,
} from "lucide-react";

interface DashboardStats {
  totalInstances: number;
  onlineInstances: number;
  offlineInstances: number;
  errorInstances: number;
  startingInstances: number;
}

interface RecentActivity {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  details: Record<string, unknown> | null;
  createdAt: string;
  user: {
    id: string;
    name: string | null;
    email: string;
  };
  instance: {
    id: string;
    name: string;
  } | null;
}

const actionLabels: Record<string, string> = {
  CREATE_INSTANCE: "Created instance",
  UPDATE_INSTANCE: "Updated instance",
  DELETE_INSTANCE: "Deleted instance",
  LOGIN: "Logged in",
  LOGOUT: "Logged out",
};

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalInstances: 0,
    onlineInstances: 0,
    offlineInstances: 0,
    errorInstances: 0,
    startingInstances: 0,
  });
  const [activity, setActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboard = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const response = await fetch("/api/dashboard");
      if (!response.ok) throw new Error("Failed to fetch dashboard data");
      const data = await response.json();
      setStats(data.data.stats);
      setActivity(data.data.activity);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => fetchDashboard(true), 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <p>Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 p-8">
        <p className="text-destructive">{error}</p>
        <Button onClick={() => fetchDashboard()}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome to ClawMeMaybe - OpenClaw Instance Management
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => fetchDashboard(true)}
            disabled={refreshing}
          >
            <RefreshCw
              className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
            />
          </Button>
          <Link href="/instances">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Instance
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Total Instances
            </CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalInstances}</div>
            <p className="text-xs text-muted-foreground">
              Registered instances
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Online</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">
              {stats.onlineInstances}
            </div>
            <p className="text-xs text-muted-foreground">Running instances</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Offline</CardTitle>
            <XCircle className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-500">
              {stats.offlineInstances}
            </div>
            <p className="text-xs text-muted-foreground">Stopped instances</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Errors</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">
              {stats.errorInstances}
            </div>
            <p className="text-xs text-muted-foreground">Requires attention</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activity.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No recent activity
              </div>
            ) : (
              <div className="space-y-4">
                {activity.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0"
                  >
                    <div className="space-y-1">
                      <p className="text-sm font-medium">
                        {actionLabels[item.action] || item.action}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {item.instance ? (
                          <>
                            Instance:{" "}
                            <Link
                              href={`/instances/${item.instance.id}`}
                              className="hover:underline"
                            >
                              {item.instance.name}
                            </Link>
                          </>
                        ) : (
                          item.entityType
                        )}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">
                        {item.user.name || item.user.email}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(item.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link href="/instances" className="block">
              <Button variant="outline" className="w-full justify-start">
                <Server className="mr-2 h-4 w-4" />
                View All Instances
              </Button>
            </Link>
            <Link href="/instances" className="block">
              <Button variant="outline" className="w-full justify-start">
                <Plus className="mr-2 h-4 w-4" />
                Register New Instance
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
