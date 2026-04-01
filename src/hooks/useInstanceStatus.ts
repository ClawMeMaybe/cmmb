"use client";

import { useState, useEffect } from "react";

interface InstanceStatus {
  status: string;
  lastChecked: Date;
  isPolling: boolean;
}

export function useInstanceStatus(instanceId: string, intervalMs = 30000) {
  const [status, setStatus] = useState<InstanceStatus>({
    status: "unknown",
    lastChecked: new Date(),
    isPolling: false,
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    let intervalId: NodeJS.Timeout | null = null;

    const fetchStatus = async () => {
      try {
        const res = await fetch(`/api/instances/${instanceId}`);
        if (!res.ok) throw new Error("Failed to fetch status");
        const data = await res.json();
        if (mounted) {
          setStatus({
            status: data.status,
            lastChecked: new Date(),
            isPolling: true,
          });
          setError(null);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : "Unknown error");
        }
      }
    };

    fetchStatus();
    intervalId = setInterval(fetchStatus, intervalMs);

    return () => {
      mounted = false;
      if (intervalId) clearInterval(intervalId);
    };
  }, [instanceId, intervalMs]);

  const stopPolling = () => {
    setStatus((prev) => ({ ...prev, isPolling: false }));
  };

  return { ...status, error, stopPolling };
}
