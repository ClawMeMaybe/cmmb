"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import type { Skill } from "@/types";

export default function SkillsPage() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null);
  const [skillContent, setSkillContent] = useState<string>("");
  const [loadingContent, setLoadingContent] = useState(false);

  useEffect(() => {
    async function fetchSkills() {
      try {
        const response = await fetch("/api/openclaw/skills");
        if (!response.ok) {
          throw new Error("Failed to fetch skills");
        }
        const data = await response.json();
        setSkills(data.data || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    }

    fetchSkills();
  }, []);

  const fetchSkillDetails = async (skillName: string) => {
    setLoadingContent(true);
    try {
      const response = await fetch(`/api/openclaw/skills/${skillName}`);
      if (response.ok) {
        const data = await response.json();
        setSkillContent(data.data?.content || "No content available");
      } else {
        setSkillContent("Failed to load skill content");
      }
    } catch {
      setSkillContent("Failed to load skill content");
    } finally {
      setLoadingContent(false);
    }
  };

  const handleSkillClick = (skill: Skill) => {
    setSelectedSkill(skill);
    setSkillContent("");
    fetchSkillDetails(skill.name);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <p>Loading...</p>
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
          <h1 className="text-3xl font-bold tracking-tight">Skills</h1>
          <p className="text-muted-foreground">
            Manage OpenClaw skills installed on this instance
          </p>
        </div>
      </div>

      {skills.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-muted-foreground">
              No skills found. Skills are stored in ~/.openclaw/skills/
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {skills.map((skill) => (
            <Card
              key={skill.name}
              className="cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => handleSkillClick(skill)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg">{skill.name}</CardTitle>
                  <Badge variant={skill.enabled ? "default" : "secondary"}>
                    {skill.enabled ? "Enabled" : "Disabled"}
                  </Badge>
                </div>
                <CardDescription className="line-clamp-2">
                  {skill.description || "No description available"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground font-mono truncate">
                  {skill.location}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog
        open={!!selectedSkill}
        onOpenChange={() => setSelectedSkill(null)}
      >
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedSkill?.name}</DialogTitle>
            <DialogDescription>
              {selectedSkill?.description || "No description available"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-medium mb-1">Location</h4>
              <p className="text-xs text-muted-foreground font-mono bg-muted p-2 rounded">
                {selectedSkill?.location}
              </p>
            </div>
            <div>
              <h4 className="text-sm font-medium mb-1">Status</h4>
              <Badge variant={selectedSkill?.enabled ? "default" : "secondary"}>
                {selectedSkill?.enabled ? "Enabled" : "Disabled"}
              </Badge>
            </div>
            <div>
              <h4 className="text-sm font-medium mb-2">SKILL.md Content</h4>
              <div className="bg-muted p-4 rounded-lg overflow-auto max-h-96">
                {loadingContent ? (
                  <p className="text-muted-foreground">Loading content...</p>
                ) : (
                  <pre className="text-xs whitespace-pre-wrap break-words">
                    {skillContent}
                  </pre>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
