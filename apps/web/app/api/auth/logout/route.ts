import { NextResponse } from "next/server";

import { clearSessionCookie, readSessionId } from "@/src/lib/session-cookie";
import { sessionStore } from "@/src/lib/stores";

export async function POST(request: import("next/server").NextRequest) {
  const sessionId = readSessionId(request);

  if (sessionId) {
    sessionStore.clear(sessionId);
  }

  const response = NextResponse.redirect(new URL("/login", request.url), {
    status: 303
  });
  clearSessionCookie(response);
  return response;
}
