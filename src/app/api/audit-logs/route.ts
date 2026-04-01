import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getAuditLogs, getAuditActionTypes } from "@/lib/audit";
import type { ApiResponse } from "@/types";

interface AuditLogWithUser {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  details: Record<string, unknown> | null;
  createdAt: Date;
  userId: string;
  instanceId: string | null;
  user: {
    id: string;
    email: string;
    name: string | null;
  };
}

interface PaginatedResponse {
  logs: AuditLogWithUser[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

interface ActionsResponse {
  actions: string[];
}

/**
 * @openapi
 * /audit-logs:
 *   get:
 *     summary: Get audit logs
 *     description: Retrieve operation audit logs with pagination and filtering. Requires admin role.
 *     tags:
 *       - Audit Logs
 *     parameters:
 *       - name: page
 *         in: query
 *         description: Page number
 *         schema:
 *           type: integer
 *           default: 1
 *       - name: pageSize
 *         in: query
 *         description: Items per page
 *         schema:
 *           type: integer
 *           default: 50
 *           maximum: 100
 *       - name: userId
 *         in: query
 *         description: Filter by user ID
 *         schema:
 *           type: string
 *       - name: action
 *         in: query
 *         description: Filter by action type
 *         schema:
 *           type: string
 *       - name: entityType
 *         in: query
 *         description: Filter by entity type
 *         schema:
 *           type: string
 *       - name: entityId
 *         in: query
 *         description: Filter by entity ID
 *         schema:
 *           type: string
 *       - name: instanceId
 *         in: query
 *         description: Filter by instance ID
 *         schema:
 *           type: string
 *       - name: startDate
 *         in: query
 *         description: Filter from date (ISO string)
 *         schema:
 *           type: string
 *           format: date-time
 *       - name: endDate
 *         in: query
 *         description: Filter to date (ISO string)
 *         schema:
 *           type: string
 *           format: date-time
 *       - name: actions
 *         in: query
 *         description: Return list of action types instead of logs
 *         schema:
 *           type: boolean
 *     responses:
 *       '200':
 *         description: Audit logs or action types
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         logs:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/AuditLog'
 *                         pagination:
 *                           type: object
 *                           properties:
 *                             page:
 *                               type: integer
 *                             pageSize:
 *                               type: integer
 *                             total:
 *                               type: integer
 *                             totalPages:
 *                               type: integer
 *                 - type: object
 *                   properties:
 *                     actions:
 *                       type: array
 *                       items:
 *                         type: string
 *       '400':
 *         description: Invalid parameters
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
 *       '403':
 *         description: Forbidden - Admin role required
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

/**
 * GET /api/audit-logs
 * List audit logs with pagination and filtering
 * Query params:
 * - page: page number (default: 1)
 * - pageSize: items per page (default: 50, max: 100)
 * - userId: filter by user ID
 * - action: filter by action type
 * - entityType: filter by entity type
 * - entityId: filter by entity ID
 * - instanceId: filter by instance ID
 * - startDate: filter from date (ISO string)
 * - endDate: filter to date (ISO string)
 */
export async function GET(
  request: NextRequest
): Promise<NextResponse<ApiResponse<PaginatedResponse> | ActionsResponse>> {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only admins can view audit logs
    if (session.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Forbidden: Admin role required" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);

    // Check if requesting action types
    if (searchParams.get("actions") === "true") {
      const actions = await getAuditActionTypes();
      return NextResponse.json({ actions });
    }

    // Parse pagination params
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const pageSize = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get("pageSize") || "50", 10))
    );

    // Parse filter params
    const userId = searchParams.get("userId") || undefined;
    const action = searchParams.get("action") || undefined;
    const entityType = searchParams.get("entityType") || undefined;
    const entityId = searchParams.get("entityId") || undefined;
    const instanceId = searchParams.get("instanceId") || undefined;
    const startDateStr = searchParams.get("startDate");
    const endDateStr = searchParams.get("endDate");

    const startDate = startDateStr ? new Date(startDateStr) : undefined;
    const endDate = endDateStr ? new Date(endDateStr) : undefined;

    // Validate dates
    if (startDateStr && isNaN(startDate!.getTime())) {
      return NextResponse.json(
        { error: "Invalid startDate format" },
        { status: 400 }
      );
    }
    if (endDateStr && isNaN(endDate!.getTime())) {
      return NextResponse.json(
        { error: "Invalid endDate format" },
        { status: 400 }
      );
    }

    const result = await getAuditLogs({
      userId,
      action,
      entityType,
      entityId,
      instanceId,
      startDate,
      endDate,
      page,
      pageSize,
    });

    return NextResponse.json({
      data: {
        logs: result.logs.map((log) => ({
          ...log,
          details: log.details as Record<string, unknown> | null,
        })),
        pagination: result.pagination,
      },
    });
  } catch (error) {
    console.error("Get audit logs error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
