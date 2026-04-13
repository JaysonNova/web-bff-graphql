import { NextResponse } from "next/server";

import { webEnv } from "@/src/lib/env";
import { isTrustedMutationRequest } from "@/src/lib/request-security";
import { setNoStore } from "@/src/lib/response";
import { clearSessionCookie, readSessionId } from "@/src/lib/session-cookie";
import { sessionStore } from "@/src/lib/stores";

export async function POST(request: import("next/server").NextRequest) {
  if (!isTrustedMutationRequest(request, { appBaseUrl: webEnv.appBaseUrl })) {
    return setNoStore(NextResponse.json({ message: "FORBIDDEN" }, { status: 403 }));
  }

  const sessionId = readSessionId(request);

  if (sessionId) {
    await sessionStore.clear(sessionId);
  }

  const response = NextResponse.redirect(new URL("/login", request.url), {
    status: 303
  });
  clearSessionCookie(response);
  return setNoStore(response);
}
