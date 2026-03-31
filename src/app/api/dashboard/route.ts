import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { ApiResponse } from "@/types";

export interface DashboardStats {
  totalInstances: number;
  onlineInstances: number;
  offlineInstances: number;
  errorInstances: number;
  startingInstances: number;
}

export interface RecentActivity {
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

export async function GET(): Promise<
  NextResponse<
    ApiResponse<{ stats: DashboardStats; activity: RecentActivity[] }>
  >
> {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get instance counts by status
    const instanceCounts = await prisma.instance.groupBy({
      by: ["status"],
      _count: true,
    });

    const stats: DashboardStats = {
      totalInstances: 0,
      onlineInstances: 0,
      offlineInstances: 0,
      errorInstances: 0,
      startingInstances: 0,
    };

    for (const count of instanceCounts) {
      stats.totalInstances += count._count;
      switch (count.status) {
        case "ONLINE":
          stats.onlineInstances = count._count;
          break;
        case "OFFLINE":
          stats.offlineInstances = count._count;
          break;
        case "ERROR":
          stats.errorInstances = count._count;
          break;
        case "STARTING":
        case "STOPPING":
          stats.startingInstances += count._count;
          break;
      }
    }

    // Get recent activity
    const auditLogs = await prisma.auditLog.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        instance: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    const activity: RecentActivity[] = auditLogs.map((log) => ({
      id: log.id,
      action: log.action,
      entityType: log.entityType,
      entityId: log.entityId,
      details: log.details as Record<string, unknown> | null,
      createdAt: log.createdAt.toISOString(),
      user: log.user,
      instance: log.instance,
    }));

    return NextResponse.json({
      data: { stats, activity },
    });
  } catch (error) {
    console.error("Get dashboard stats error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
