"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  CheckCircle,
  XCircle,
  Loader2,
  ArrowLeft,
  Settings,
  RefreshCw,
  Eye,
  EyeOff,
} from "lucide-react";
import Link from "next/link";

interface GatewayConfig {
  gatewayUrl: string;
  hasToken: boolean;
}

interface TestResult {
  success: boolean;
  message: string;
  details?: {
    version?: string;
    uptime?: number;
  };
}

export default function GatewaySettingsPage() {
  const [config, setConfig] = useState<GatewayConfig>({
    gatewayUrl: "",
    hasToken: false,
  });
  const [gatewayUrl, setGatewayUrl] = useState("");
  const [gatewayToken, setGatewayToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const res = await fetch("/api/openclaw/gateway/config");
      if (res.ok) {
        const data: GatewayConfig = await res.json();
        setConfig(data);
        setGatewayUrl(data.gatewayUrl);
      }
    } catch (err) {
      console.error("Failed to fetch config:", err);
    } finally {
      setLoading(false);
    }
  };

  const testConnection = async () => {
    setTesting(true);
    setTestResult(null);

    try {
      const res = await fetch("/api/openclaw/gateway/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gatewayUrl: gatewayUrl || undefined,
          gatewayToken: gatewayToken || undefined,
        }),
      });

      const data: TestResult = await res.json();
      setTestResult(data);
    } catch (err) {
      setTestResult({
        success: false,
        message: err instanceof Error ? err.message : "Connection test failed",
      });
    } finally {
      setTesting(false);
    }
  };

  const formatUptime = (seconds: number): string => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`;
    }
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Gateway Settings
          </h1>
          <p className="text-muted-foreground">
            Configure OpenClaw Gateway connection
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Connection Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="gatewayUrl">Gateway URL</Label>
            <Input
              id="gatewayUrl"
              type="url"
              placeholder="http://localhost:18789"
              value={gatewayUrl}
              onChange={(e) => setGatewayUrl(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              The URL of your OpenClaw Gateway instance
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="gatewayToken">Gateway Token</Label>
            <div className="relative">
              <Input
                id="gatewayToken"
                type={showToken ? "text" : "password"}
                placeholder={config.hasToken ? "••••••••••••" : "Enter token"}
                value={gatewayToken}
                onChange={(e) => setGatewayToken(e.target.value)}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full"
                onClick={() => setShowToken(!showToken)}
              >
                {showToken ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {config.hasToken
                ? "A token is configured. Enter a new token to update."
                : "No token configured. Enter your gateway token to enable connection."}
            </p>
          </div>

          <div className="flex gap-3">
            <Button onClick={testConnection} disabled={testing}>
              {testing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Testing...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Test Connection
                </>
              )}
            </Button>
          </div>

          {testResult && (
            <div
              className={`flex items-start gap-3 p-4 rounded-lg ${
                testResult.success
                  ? "bg-green-50 dark:bg-green-950"
                  : "bg-red-50 dark:bg-red-950"
              }`}
            >
              {testResult.success ? (
                <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
              )}
              <div>
                <p className="font-medium">{testResult.message}</p>
                {testResult.details && (
                  <div className="mt-2 text-sm text-muted-foreground">
                    {testResult.details.version && (
                      <p>Version: {testResult.details.version}</p>
                    )}
                    {testResult.details.uptime !== undefined && (
                      <p>Uptime: {formatUptime(testResult.details.uptime)}</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Current Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <div
              className={`h-3 w-3 rounded-full ${
                config.hasToken ? "bg-green-500" : "bg-yellow-500"
              }`}
            />
            <div>
              <p className="font-medium">
                {config.hasToken ? "Token Configured" : "No Token Set"}
              </p>
              <p className="text-sm text-muted-foreground">
                Gateway URL: {config.gatewayUrl}
              </p>
            </div>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Note: Token and URL changes require server restart to take effect.
            Use environment variables OPENCLAW_GATEWAY_URL and
            OPENCLAW_GATEWAY_TOKEN.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
