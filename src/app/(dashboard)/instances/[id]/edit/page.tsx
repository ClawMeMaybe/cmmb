"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function EditInstancePage() {
  const router = useRouter();
  const params = useParams();
  const instanceId = params.id as string;
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [name, setName] = useState("");
  const [gatewayUrl, setGatewayUrl] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    fetch(`/api/instances/${instanceId}`)
      .then((res) => res.json())
      .then((data) => {
        setName(data.name);
        setGatewayUrl(data.gatewayUrl);
        setDescription(data.description || "");
      })
      .finally(() => setIsFetching(false));
  }, [instanceId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !gatewayUrl) {
      toast.error("Name and Gateway URL are required");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`/api/instances/${instanceId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, gatewayUrl, description }),
      });
      if (!res.ok) throw new Error("Failed to update instance");
      toast.success("Instance updated successfully");
      router.push(`/instances/${instanceId}`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update instance"
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (isFetching) return <p className="p-6">Loading...</p>;

  return (
    <div className="max-w-2xl mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>Edit Instance</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Instance Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="gatewayUrl">Gateway URL</Label>
              <Input
                id="gatewayUrl"
                type="url"
                value={gatewayUrl}
                onChange={(e) => setGatewayUrl(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="flex gap-4">
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Saving..." : "Save Changes"}
              </Button>
              <Button variant="outline" onClick={() => router.back()}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
