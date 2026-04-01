import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { readdir, readFile } from "fs/promises";
import { join } from "path";
import type { ApiResponse, Skill, SkillMetadata } from "@/types";

const SKILLS_DIR =
  process.env.SKILLS_DIR ||
  join(process.env.HOME || "/root", ".openclaw/skills");

function parseSkillMarkdown(content: string, location: string): Skill {
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);

  const metadata: SkillMetadata = {
    name: location.split("/").pop() || location,
    description: "",
  };

  let body = content;

  if (frontmatterMatch) {
    const frontmatter = frontmatterMatch[1];
    body = frontmatterMatch[2];

    // Parse YAML frontmatter
    const lines = frontmatter.split("\n");

    for (const line of lines) {
      const keyValueMatch = line.match(/^(\w+):\s*(.*)$/);
      if (keyValueMatch) {
        const [, key, value] = keyValueMatch;
        if (key === "name") {
          metadata.name = value;
        } else if (key === "description") {
          metadata.description = value;
        }
      }
    }
  }

  // Extract description from first paragraph if not in frontmatter
  if (!metadata.description && body) {
    const lines = body.split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#") && !trimmed.startsWith("---")) {
        metadata.description = trimmed.slice(0, 200);
        break;
      }
    }
  }

  return {
    ...metadata,
    location,
    enabled: true,
  };
}

export async function GET(): Promise<
  NextResponse<ApiResponse<Skill[]> | { error: string }>
> {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const skillsDir = SKILLS_DIR;
    let dirs: string[] = [];

    try {
      const entries = await readdir(skillsDir, { withFileTypes: true });
      dirs = entries
        .filter((entry) => entry.isDirectory() && !entry.name.startsWith("."))
        .map((entry) => entry.name);
    } catch {
      // Skills directory doesn't exist
      return NextResponse.json({ data: [] });
    }

    const skills: Skill[] = [];

    for (const dir of dirs) {
      const skillPath = join(skillsDir, dir);
      const skillMdPath = join(skillPath, "SKILL.md");

      try {
        const content = await readFile(skillMdPath, "utf-8");
        const skill = parseSkillMarkdown(content, skillPath);
        skill.name = dir; // Use directory name as skill name
        skills.push(skill);
      } catch {
        // No SKILL.md, create a minimal entry
        skills.push({
          name: dir,
          description: "No description available",
          location: skillPath,
          enabled: true,
        });
      }
    }

    return NextResponse.json({ data: skills });
  } catch (error) {
    console.error("Get skills error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
