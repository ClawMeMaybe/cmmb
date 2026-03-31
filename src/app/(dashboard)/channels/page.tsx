"use client";

import { useEffect, useState } from "react";
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
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MessageSquare, Settings, RefreshCw, Plus } from "lucide-react";
import type { Channel, ChannelType, ChannelStatus } from "@/types";

const channelTypeLabels: Record<ChannelType, string> = {
  WHATSAPP: "WhatsApp",
  TELEGRAM: "Telegram",
  DISCORD: "Discord",
  SIGNAL: "Signal",
  WECHAT: "WeChat",
  WEIBO: "Weibo",
  DINGTALK: "DingTalk",
  FEISHU: "Feishu",
  WECOM: "WeCom",
  QQBOT: "QQ Bot",
  SLACK: "Slack",
  OTHER: "Other",
};

const statusColors: Record<ChannelStatus, string> = {
  ONLINE: "bg-green-500",
  OFFLINE: "bg-gray-500",
  ERROR: "bg-red-500",
  CONFIGURING: "bg-yellow-500",
};

export default function ChannelsPage() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [testingConnection, setTestingConnection] = useState(false);

  useEffect(() => {
    fetchChannels();
  }, []);

  async function fetchChannels() {
    try {
      const response = await fetch("/api/channels");
      if (!response.ok) {
        throw new Error("Failed to fetch channels");
      }
      const data = await response.json();
      setChannels(data.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }

  async function toggleChannelEnabled(channel: Channel) {
    try {
      const response = await fetch(`/api/channels/${channel.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !channel.enabled }),
      });
      if (!response.ok) {
        throw new Error("Failed to update channel");
      }
      fetchChannels();
    } catch (err) {
      console.error("Toggle channel error:", err);
    }
  }

  async function testConnection() {
    if (!selectedChannel) return;
    setTestingConnection(true);
    try {
      // Simulate connection test - in real implementation this would call the gateway
      await new Promise((resolve) => setTimeout(resolve, 2000));
      // For now, just close the dialog
      setConfigDialogOpen(false);
    } finally {
      setTestingConnection(false);
    }
  }

  async function saveChannelConfig(updatedConfig: Partial<Channel>) {
    if (!selectedChannel) return;
    try {
      const response = await fetch(`/api/channels/${selectedChannel.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedConfig),
      });
      if (!response.ok) {
        throw new Error("Failed to save channel config");
      }
      setConfigDialogOpen(false);
      fetchChannels();
    } catch (err) {
      console.error("Save config error:", err);
    }
  }

  function openConfigDialog(channel: Channel) {
    setSelectedChannel(channel);
    setConfigDialogOpen(true);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-destructive">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Channels</h1>
          <p className="text-muted-foreground">
            Manage your messaging channel integrations
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Channel
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Channels</CardTitle>
          <CardDescription>
            A list of all configured messaging channels
          </CardDescription>
        </CardHeader>
        <CardContent>
          {channels.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MessageSquare className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <p>No channels configured.</p>
              <p className="text-sm mt-2">
                Add a channel to start receiving messages.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Account ID</TableHead>
                  <TableHead>Enabled</TableHead>
                  <TableHead>Last Activity</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {channels.map((channel) => (
                  <TableRow key={channel.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="h-4 w-4 text-muted-foreground" />
                        {channel.name}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {channelTypeLabels[channel.type]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={`${statusColors[channel.status]} text-white`}
                      >
                        {channel.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {channel.accountId || "-"}
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={channel.enabled}
                        onCheckedChange={() => toggleChannelEnabled(channel)}
                      />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {channel.lastInbound
                        ? new Date(channel.lastInbound).toLocaleString()
                        : "Never"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openConfigDialog(channel)}
                      >
                        <Settings className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Channel Config Dialog */}
      <Dialog open={configDialogOpen} onOpenChange={setConfigDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Channel Configuration</DialogTitle>
            <DialogDescription>
              Configure settings for {selectedChannel?.name}
            </DialogDescription>
          </DialogHeader>
          {selectedChannel && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Channel Name</Label>
                <Input
                  id="name"
                  value={selectedChannel.name}
                  onChange={(e) =>
                    setSelectedChannel({
                      ...selectedChannel,
                      name: e.target.value,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">Channel Type</Label>
                <Select
                  value={selectedChannel.type}
                  onValueChange={(value) =>
                    setSelectedChannel({
                      ...selectedChannel,
                      type: value as ChannelType,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(channelTypeLabels).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="accountId">Account ID</Label>
                <Input
                  id="accountId"
                  value={selectedChannel.accountId || ""}
                  onChange={(e) =>
                    setSelectedChannel({
                      ...selectedChannel,
                      accountId: e.target.value,
                    })
                  }
                  placeholder="Enter account ID..."
                />
              </div>
              {selectedChannel.lastError && (
                <div className="space-y-2">
                  <Label className="text-destructive">Last Error</Label>
                  <p className="text-sm text-destructive bg-destructive/10 p-2 rounded">
                    {selectedChannel.lastError}
                  </p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={testConnection}
              disabled={testingConnection}
            >
              {testingConnection ? (
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Test Connection
            </Button>
            <Button onClick={() => saveChannelConfig(selectedChannel!)}>
              Save Changes
            </Button>
            <Button variant="ghost" onClick={() => setConfigDialogOpen(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
