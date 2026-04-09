import { NextResponse } from "next/server";

import { readSessionId } from "@/src/lib/session-cookie";
import { sessionStore } from "@/src/lib/stores";

export async function GET(request: import("next/server").NextRequest) {
  const sessionId = readSessionId(request);
  const session = sessionId ? sessionStore.get(sessionId) : null;

  if (!session) {
    return NextResponse.json({ message: "UNAUTHENTICATED" }, { status: 401 });
  }

  return NextResponse.json({
    session: {
      id: session.id,
      user: session.user,
      createdAt: session.createdAt
    },
    lastTrace: session.lastTrace
  });
}
