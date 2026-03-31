import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { InstanceStatus } from "@prisma/client";

// Temporary mock data for display
const mockStats = {
  totalInstances: 5,
  onlineInstances: 3,
  offlineInstances: 2,
  errorInstances: 0,
};

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome to ClawMeMaybe - OpenClaw Instance Management
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Total Instances
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockStats.totalInstances}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Online</CardTitle>
            <Badge variant="default" className="bg-green-500">
              {InstanceStatus.ONLINE}
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {mockStats.onlineInstances}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Offline</CardTitle>
            <Badge variant="secondary">{InstanceStatus.OFFLINE}</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {mockStats.offlineInstances}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Errors</CardTitle>
            <Badge variant="destructive">{InstanceStatus.ERROR}</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockStats.errorInstances}</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
