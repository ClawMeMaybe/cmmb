"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Server,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Plus,
  Smartphone,
  MessageSquare,
} from "lucide-react";
import { GatewayStatus } from "@/components/dashboard/gateway-status";

interface DashboardStats {
  totalInstances: number;
  onlineInstances: number;
  offlineInstances: number;
  errorInstances: number;
}

interface PairedDevice {
  deviceId: string;
  role: string;
  platform?: string;
  lastSeen?: string;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalInstances: 0,
    onlineInstances: 0,
    offlineInstances: 0,
    errorInstances: 0,
  });
  const [devices, setDevices] = useState<PairedDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboard = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      // Fetch instances stats
      const instancesRes = await fetch("/api/instances");
      if (instancesRes.ok) {
        const instancesData = await instancesRes.json();
        const instances = instancesData.data || [];

        const stats = {
          totalInstances: instances.length,
          onlineInstances: instances.filter(
            (i: { status: string }) => i.status === "ONLINE"
          ).length,
          offlineInstances: instances.filter(
            (i: { status: string }) => i.status === "OFFLINE"
          ).length,
          errorInstances: instances.filter(
            (i: { status: string }) => i.status === "ERROR"
          ).length,
        };
        setStats(stats);
      }

      // Fetch paired devices count
      try {
        const devicesRes = await fetch("/api/openclaw/devices");
        if (devicesRes.ok) {
          const devicesData = await devicesRes.json();
          setDevices(devicesData.data || []);
        }
      } catch {
        // Devices endpoint may not exist yet
      }
    } catch (err) {
      console.error("Failed to fetch dashboard data:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            OpenClaw Instance Management Console
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

      {/* OpenClaw Gateway Status */}
      <GatewayStatus showDetails />

      {/* Stats Grid */}
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

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-3">
        <Link href="/instances">
          <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
            <CardContent className="flex items-center gap-4 pt-6">
              <Server className="h-8 w-8 text-muted-foreground" />
              <div>
                <p className="font-medium">Manage Instances</p>
                <p className="text-sm text-muted-foreground">
                  View and control OpenClaw instances
                </p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/devices">
          <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
            <CardContent className="flex items-center gap-4 pt-6">
              <Smartphone className="h-8 w-8 text-muted-foreground" />
              <div>
                <p className="font-medium">Paired Devices</p>
                <p className="text-sm text-muted-foreground">
                  {devices.length} device{devices.length !== 1 ? "s" : ""}{" "}
                  connected
                </p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Card className="cursor-pointer hover:bg-muted/50 transition-colors opacity-50">
          <CardContent className="flex items-center gap-4 pt-6">
            <MessageSquare className="h-8 w-8 text-muted-foreground" />
            <div>
              <p className="font-medium">Channels</p>
              <p className="text-sm text-muted-foreground">Coming soon</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
