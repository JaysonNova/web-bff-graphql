import { NextResponse } from "next/server";

import { jsonNoStore } from "@/src/lib/response";
import { readSessionId } from "@/src/lib/session-cookie";
import { sessionStore } from "@/src/lib/stores";

export async function GET(request: import("next/server").NextRequest) {
  const sessionId = readSessionId(request);
  const session = sessionId ? await sessionStore.get(sessionId) : null;

  if (!session) {
    return jsonNoStore(
      {
        authenticated: false
      },
      {
        status: 401
      }
    );
  }

  return jsonNoStore({
    authenticated: true,
    user: session.user,
    createdAt: session.createdAt
  });
}
