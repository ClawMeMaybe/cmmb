import { NextResponse } from "next/server";
import { generateOpenApiSpec } from "@/lib/openapi";

/**
 * @openapi
 * /docs/openapi.json:
 *   get:
 *     summary: Get OpenAPI specification
 *     description: Returns the OpenAPI 3.0 specification for the ClawMeMaybe API
 *     tags:
 *       - Documentation
 *     responses:
 *       '200':
 *         description: OpenAPI specification
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               description: OpenAPI 3.0 specification document
 */
export async function GET() {
  const spec = generateOpenApiSpec();
  return NextResponse.json(spec);
}
