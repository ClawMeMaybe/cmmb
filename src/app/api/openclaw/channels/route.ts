import { NextResponse } from "next/server";
import fs from "fs";

export async function GET() {
  try {
    const configPath = "/root/.openclaw/openclaw.json";

    if (!fs.existsSync(configPath)) {
      return NextResponse.json({ data: [] });
    }

    const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
    const channels: Array<{
      name: string;
      type: string;
      enabled: boolean;
    }> = [];

    // Extract channels from plugins
    const plugins = config.plugins?.entries || {};
    for (const [name, plugin] of Object.entries(plugins)) {
      const p = plugin as { enabled?: boolean };
      if (name.includes("-") && !["acpx", "device-pair"].includes(name)) {
        channels.push({
          name,
          type: name.split("-")[0].toUpperCase(),
          enabled: p.enabled ?? true,
        });
      }
    }

    return NextResponse.json({ data: channels });
  } catch {
    return NextResponse.json(
      { error: "Failed to read channels" },
      { status: 500 }
    );
  }
}
