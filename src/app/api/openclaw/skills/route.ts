import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET() {
  try {
    const skillsDir = "/usr/lib/node_modules/openclaw/skills";
    const skills: Array<{
      name: string;
      description: string;
      location: string;
    }> = [];

    if (fs.existsSync(skillsDir)) {
      const entries = fs.readdirSync(skillsDir, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.isDirectory()) {
          const skillPath = path.join(skillsDir, entry.name);
          const skillMdPath = path.join(skillPath, "SKILL.md");

          let description = "";
          if (fs.existsSync(skillMdPath)) {
            const content = fs.readFileSync(skillMdPath, "utf-8");
            const descMatch = content.match(/^#\s+(.+)$/m);
            description = descMatch ? descMatch[1] : entry.name;
          }

          skills.push({
            name: entry.name,
            description,
            location: skillPath,
          });
        }
      }
    }

    return NextResponse.json({ data: skills });
  } catch {
    return NextResponse.json(
      { error: "Failed to read skills" },
      { status: 500 }
    );
  }
}
