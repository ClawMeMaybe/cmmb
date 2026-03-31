import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { readFile } from "fs/promises";
import { join, basename } from "path";
import type { ApiResponse, Skill, SkillMetadata } from "@/types";

const SKILLS_DIR =
  process.env.SKILLS_DIR ||
  join(process.env.HOME || "/root", ".openclaw/skills");

function parseSkillMarkdown(content: string, location: string): Skill {
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);

  const metadata: SkillMetadata = {
    name: basename(location),
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
    content: body.trim(),
  };
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ name: string }> }
): Promise<NextResponse<ApiResponse<Skill> | { error: string }>> {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name } = await params;

    // Validate skill name to prevent path traversal
    if (name.includes("..") || name.includes("/") || name.includes("\\")) {
      return NextResponse.json(
        { error: "Invalid skill name" },
        { status: 400 }
      );
    }

    const skillPath = join(SKILLS_DIR, name);
    const skillMdPath = join(skillPath, "SKILL.md");

    try {
      const content = await readFile(skillMdPath, "utf-8");
      const skill = parseSkillMarkdown(content, skillPath);
      skill.name = name;
      return NextResponse.json({ data: skill });
    } catch {
      return NextResponse.json({ error: "Skill not found" }, { status: 404 });
    }
  } catch (error) {
    console.error("Get skill error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
