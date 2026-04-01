import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getInstances, createInstance } from "@/server/instances";
import { InstanceStatus } from "@prisma/client";
import type { ApiResponse, Instance } from "@/types";

/**
 * @openapi
 * /instances:
 *   get:
 *     summary: Get instance list
 *     description: Retrieve all OpenClaw instances
 *     tags:
 *       - Instances
 *     responses:
 *       '200':
 *         description: List of instances
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Instance'
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
 *     summary: Create a new instance
 *     description: Create a new OpenClaw instance configuration
 *     tags:
 *       - Instances
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateInstanceRequest'
 *     responses:
 *       '201':
 *         description: Instance created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/Instance'
 *                 message:
 *                   type: string
 *                   example: "Instance created successfully"
 *       '400':
 *         description: Missing required fields
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

export async function GET(): Promise<NextResponse<ApiResponse<Instance[]>>> {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const instances = await getInstances();

    return NextResponse.json({ data: instances });
  } catch (error) {
    console.error("Get instances error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest
): Promise<NextResponse<ApiResponse<Instance>>> {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, gatewayUrl, token } = body;

    if (!name || !gatewayUrl || !token) {
      return NextResponse.json(
        { error: "Name, gatewayUrl, and token are required" },
        { status: 400 }
      );
    }

    const instance = await createInstance({
      name,
      description,
      status: InstanceStatus.OFFLINE,
      gatewayUrl,
      token,
      createdById: session.id,
    });

    return NextResponse.json(
      { data: instance, message: "Instance created successfully" },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create instance error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
