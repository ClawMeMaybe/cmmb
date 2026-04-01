import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getChannels, createChannel } from "@/server/channels";
import { ChannelType, ChannelStatus } from "@prisma/client";
import type { ApiResponse, Channel } from "@/types";

/**
 * @openapi
 * /channels:
 *   get:
 *     summary: Get channel list
 *     description: Retrieve all configured channels
 *     tags:
 *       - Channels
 *     responses:
 *       '200':
 *         description: List of channels
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Channel'
 *       '401':
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       '500':
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *   post:
 *     summary: Create a new channel
 *     description: Create a new communication channel configuration
 *     tags:
 *       - Channels
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateChannelRequest'
 *     responses:
 *       '201':
 *         description: Channel created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/Channel'
 *                 message:
 *                   type: string
 *                   example: "Channel created successfully"
 *       '400':
 *         description: Invalid request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       '401':
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       '500':
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

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
