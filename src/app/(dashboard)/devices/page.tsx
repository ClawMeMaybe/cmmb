"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import type { PairedDevice } from "@/types/device";

export default function DevicesPage() {
  const [devices, setDevices] = useState<PairedDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDevice, setSelectedDevice] = useState<PairedDevice | null>(
    null
  );
  const [showDetails, setShowDetails] = useState(false);
  const [showRevokeConfirm, setShowRevokeConfirm] = useState(false);
  const [revoking, setRevoking] = useState(false);

  const fetchDevices = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/openclaw/devices");
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setDevices(data.data || []);
      }
    } catch {
      setError("Failed to fetch devices");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDevices();
  }, []);

  const handleRevoke = async () => {
    if (!selectedDevice) return;

    setRevoking(true);
    try {
      const res = await fetch(
        `/api/openclaw/devices/${selectedDevice.deviceId}`,
        {
          method: "DELETE",
        }
      );
      const data = await res.json();

      if (data.error) {
        setError(data.error);
      } else {
        setDevices(
          devices.filter((d) => d.deviceId !== selectedDevice.deviceId)
        );
        setShowRevokeConfirm(false);
        setSelectedDevice(null);
      }
    } catch {
      setError("Failed to revoke device");
    } finally {
      setRevoking(false);
    }
  };

  const formatTimestamp = (ms: number) => {
    return new Date(ms).toLocaleString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const isOnline = (device: PairedDevice) => {
    // Consider online if last seen within last 5 minutes
    const lastSeen = device.lastSeen || device.createdAtMs;
    return Date.now() - lastSeen < 5 * 60 * 1000;
  };

  const getStatusBadge = (device: PairedDevice) => {
    const online = isOnline(device);
    return (
      <Badge variant={online ? "default" : "secondary"}>
        {online ? "Online" : "Offline"}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading devices...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-destructive">{error}</p>
        <Button
          onClick={() => {
            setError(null);
            fetchDevices();
          }}
        >
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Paired Devices</h1>
          <p className="text-muted-foreground mt-1">
            Manage devices paired with OpenClaw Gateway
          </p>
        </div>
        <Button onClick={fetchDevices} variant="outline">
          Refresh
        </Button>
      </div>

      {devices.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No paired devices found</p>
        </div>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Status</TableHead>
                <TableHead>Device ID</TableHead>
                <TableHead>Platform</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Last Seen</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {devices.map((device) => (
                <TableRow key={device.deviceId}>
                  <TableCell>{getStatusBadge(device)}</TableCell>
                  <TableCell className="font-mono text-sm max-w-[200px] truncate">
                    {device.deviceId.substring(0, 12)}...
                  </TableCell>
                  <TableCell className="capitalize">
                    {device.platform || "Unknown"}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{device.role}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatTimestamp(device.lastSeen || device.createdAtMs)}
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedDevice(device);
                        setShowDetails(true);
                      }}
                    >
                      Details
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => {
                        setSelectedDevice(device);
                        setShowRevokeConfirm(true);
                      }}
                    >
                      Revoke
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Device Details Modal */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Device Details</DialogTitle>
            <DialogDescription>
              Information about this paired device
            </DialogDescription>
          </DialogHeader>
          {selectedDevice && (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Device ID</span>
                  <span className="font-mono text-sm">
                    {selectedDevice.deviceId.substring(0, 16)}...
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Public Key</span>
                  <span className="font-mono text-sm">
                    {selectedDevice.publicKey.substring(0, 16)}...
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Platform</span>
                  <span className="capitalize">
                    {selectedDevice.platform || "Unknown"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Client</span>
                  <span>{selectedDevice.clientId || "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Role</span>
                  <span>{selectedDevice.role}</span>
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-muted-foreground text-sm">Scopes</span>
                <div className="flex flex-wrap gap-1">
                  {selectedDevice.scopes.map((scope) => (
                    <Badge key={scope} variant="secondary" className="text-xs">
                      {scope}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-muted-foreground text-sm">
                  Timestamps
                </span>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Created</span>
                    <span>{formatTimestamp(selectedDevice.createdAtMs)}</span>
                  </div>
                  {selectedDevice.approvedAtMs && (
                    <div className="flex justify-between">
                      <span>Approved</span>
                      <span>
                        {formatTimestamp(selectedDevice.approvedAtMs)}
                      </span>
                    </div>
                  )}
                  {selectedDevice.lastSeen && (
                    <div className="flex justify-between">
                      <span>Last Seen</span>
                      <span>{formatTimestamp(selectedDevice.lastSeen)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetails(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revoke Confirmation Modal */}
      <Dialog open={showRevokeConfirm} onOpenChange={setShowRevokeConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revoke Device Access</DialogTitle>
            <DialogDescription>
              Are you sure you want to revoke access for this device? This
              action cannot be undone and the device will need to be paired
              again.
            </DialogDescription>
          </DialogHeader>
          {selectedDevice && (
            <div className="bg-muted p-3 rounded-lg space-y-1">
              <div className="font-mono text-sm">
                {selectedDevice.deviceId.substring(0, 16)}...
              </div>
              <div className="text-sm text-muted-foreground capitalize">
                {selectedDevice.platform || "Unknown"} • {selectedDevice.role}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowRevokeConfirm(false)}
              disabled={revoking}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRevoke}
              disabled={revoking}
            >
              {revoking ? "Revoking..." : "Revoke Access"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
