import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { promises as fs } from "fs";
import type { ApiResponse } from "@/types";
import type { PairedDevices } from "@/types/device";

const PAIRED_DEVICES_PATH = "/root/.openclaw/devices/paired.json";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<null>>> {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: deviceId } = await params;

    // Read current devices
    let devices: PairedDevices;
    try {
      const content = await fs.readFile(PAIRED_DEVICES_PATH, "utf-8");
      devices = JSON.parse(content);
    } catch {
      return NextResponse.json({ error: "Device not found" }, { status: 404 });
    }

    // Check if device exists
    if (!devices[deviceId]) {
      return NextResponse.json({ error: "Device not found" }, { status: 404 });
    }

    // Remove device
    delete devices[deviceId];

    // Write back to file
    await fs.writeFile(
      PAIRED_DEVICES_PATH,
      JSON.stringify(devices, null, 2),
      "utf-8"
    );

    return NextResponse.json({ message: "Device revoked successfully" });
  } catch (error) {
    console.error("Delete paired device error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
