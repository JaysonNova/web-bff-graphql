import { NextResponse } from "next/server";

import { webEnv } from "@/src/lib/env";
import { jsonNoStore } from "@/src/lib/response";
import { readSessionId } from "@/src/lib/session-cookie";
import { sessionStore } from "@/src/lib/stores";

export async function GET(request: import("next/server").NextRequest) {
  if (!webEnv.enableTraceUi) {
    return jsonNoStore({ message: "NOT_FOUND" }, { status: 404 });
  }

  const sessionId = readSessionId(request);
  const session = sessionId ? await sessionStore.get(sessionId) : null;

  if (!session) {
    return jsonNoStore({ message: "UNAUTHENTICATED" }, { status: 401 });
  }

  return jsonNoStore({
    session: {
      id: session.id,
      user: session.user,
      createdAt: session.createdAt
    },
    lastTrace: session.lastTrace
  });
}
