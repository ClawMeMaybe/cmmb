import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getChannels, createChannel } from "@/server/channels";
import { ChannelType, ChannelStatus } from "@prisma/client";
import type { ApiResponse, Channel } from "@/types";

export async function GET(): Promise<NextResponse<ApiResponse<Channel[]>>> {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const channels = await getChannels();

    return NextResponse.json({ data: channels });
  } catch (error) {
    console.error("Get channels error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest
): Promise<NextResponse<ApiResponse<Channel>>> {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, type, instanceId, config } = body;

    if (!name) {
      return NextResponse.json(
        { error: "Channel name is required" },
        { status: 400 }
      );
    }

    // Validate channel type if provided
    if (type && !Object.values(ChannelType).includes(type)) {
      return NextResponse.json(
        { error: "Invalid channel type" },
        { status: 400 }
      );
    }

    const channel = await createChannel({
      name,
      type: type ?? ChannelType.OTHER,
      status: ChannelStatus.CONFIGURING,
      enabled: true,
      instanceId: instanceId ?? null,
      config: config ?? null,
    });

    return NextResponse.json(
      { data: channel, message: "Channel created successfully" },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create channel error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
