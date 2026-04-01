import { NextResponse } from "next/server";
import { getSession, getUserSessions } from "@/lib/auth";
import type { ApiResponse } from "@/types";

type SessionInfo = {
  id: string;
  userAgent: string | null;
  ipAddress: string | null;
  createdAt: string;
  lastAccessed: string;
  expiresAt: string;
  isCurrent: boolean;
};

export async function GET(): Promise<
  NextResponse<ApiResponse<{ sessions: SessionInfo[] }>>
> {
  try {
    const user = await getSession();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sessions = await getUserSessions(user.id);

    return NextResponse.json({
      data: {
        sessions: sessions.map((s) => ({
          id: s.id,
          userAgent: s.userAgent,
          ipAddress: s.ipAddress,
          createdAt: s.createdAt.toISOString(),
          lastAccessed: s.lastAccessed.toISOString(),
          expiresAt: s.expiresAt.toISOString(),
          isCurrent: s.isCurrent,
        })),
      },
    });
  } catch (error) {
    console.error("Get sessions error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
