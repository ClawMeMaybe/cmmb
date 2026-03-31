import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { promises as fs } from "fs";
import type { ApiResponse } from "@/types";
import type { PairedDevice, PairedDevices } from "@/types/device";

const PAIRED_DEVICES_PATH = "/root/.openclaw/devices/paired.json";

export async function GET(): Promise<
  NextResponse<ApiResponse<PairedDevice[]>>
> {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Read paired devices from file
    let devices: PairedDevices;
    try {
      const content = await fs.readFile(PAIRED_DEVICES_PATH, "utf-8");
      devices = JSON.parse(content);
    } catch {
      // File doesn't exist or is invalid
      devices = {};
    }

    // Convert to array and add lastSeen based on token creation
    const deviceList: PairedDevice[] = Object.values(devices).map((device) => ({
      ...device,
      lastSeen: device.tokens?.operator?.createdAtMs || device.createdAtMs,
    }));

    return NextResponse.json({ data: deviceList });
  } catch (error) {
    console.error("Get paired devices error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
