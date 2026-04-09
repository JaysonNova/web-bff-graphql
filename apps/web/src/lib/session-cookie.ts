import type { NextRequest, NextResponse } from "next/server";

export const SESSION_COOKIE_NAME = "bff_session";

export function readSessionId(request: NextRequest) {
  return request.cookies.get(SESSION_COOKIE_NAME)?.value ?? null;
}

export function writeSessionCookie(response: NextResponse, sessionId: string) {
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: sessionId,
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    path: "/"
  });
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    expires: new Date(0),
    path: "/"
  });
}
