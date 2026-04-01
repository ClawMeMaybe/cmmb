import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  getInstanceById,
  updateInstance,
  deleteInstance,
} from "@/server/instances";
import type { ApiResponse, Instance } from "@/types";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * @openapi
 * /instances/{id}:
 *   get:
 *     summary: Get instance details
 *     description: Retrieve details of a specific OpenClaw instance
 *     tags:
 *       - Instances
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Instance ID
 *         schema:
 *           type: string
 *     responses:
 *       '200':
 *         description: Instance details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/Instance'
 *       '401':
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       '404':
 *         description: Instance not found
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
 *   put:
 *     summary: Update an instance
 *     description: Update configuration of an existing OpenClaw instance
 *     tags:
 *       - Instances
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Instance ID
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateInstanceRequest'
 *     responses:
 *       '200':
 *         description: Instance updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/Instance'
 *                 message:
 *                   type: string
 *                   example: "Instance updated successfully"
 *       '401':
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       '404':
 *         description: Instance not found
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
 *   delete:
 *     summary: Delete an instance
 *     description: Delete an OpenClaw instance configuration
 *     tags:
 *       - Instances
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Instance ID
 *         schema:
 *           type: string
 *     responses:
 *       '200':
 *         description: Instance deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Instance deleted successfully"
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

export async function GET(
  _request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<ApiResponse<Instance>>> {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const instance = await getInstanceById(id);

    if (!instance) {
      return NextResponse.json(
        { error: "Instance not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: instance });
  } catch (error) {
    console.error("Get instance error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<ApiResponse<Instance>>> {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const instance = await updateInstance(id, body, session.id);

    if (!instance) {
      return NextResponse.json(
        { error: "Instance not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      data: instance,
      message: "Instance updated successfully",
    });
  } catch (error) {
    console.error("Update instance error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<ApiResponse<null>>> {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    await deleteInstance(id, session.id);

    return NextResponse.json({ message: "Instance deleted successfully" });
  } catch (error) {
    console.error("Delete instance error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
