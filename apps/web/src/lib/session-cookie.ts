import type { NextRequest, NextResponse } from "next/server";

import { webEnv } from "./env";

export const LEGACY_SESSION_COOKIE_NAME = "bff_session";

export function buildSessionCookieName(secure: boolean) {
  return secure ? "__Host-bff_session" : LEGACY_SESSION_COOKIE_NAME;
}

function activeSessionCookieName() {
  return buildSessionCookieName(webEnv.sessionCookieSecure);
}

export function readSessionId(request: NextRequest) {
  return (
    request.cookies.get(activeSessionCookieName())?.value ??
    request.cookies.get(LEGACY_SESSION_COOKIE_NAME)?.value ??
    null
  );
}

export function writeSessionCookie(
  response: NextResponse,
  sessionId: string,
  options: {
    secure?: boolean;
  } = {}
) {
  const secure = options.secure ?? webEnv.sessionCookieSecure;
  response.cookies.set({
    name: buildSessionCookieName(secure),
    value: sessionId,
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/"
  });
}

export function clearSessionCookie(
  response: NextResponse,
  options: {
    secure?: boolean;
  } = {}
) {
  const secure = options.secure ?? webEnv.sessionCookieSecure;

  response.cookies.set({
    name: buildSessionCookieName(secure),
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure,
    expires: new Date(0),
    path: "/"
  });

  if (secure) {
    response.cookies.set({
      name: LEGACY_SESSION_COOKIE_NAME,
      value: "",
      httpOnly: true,
      sameSite: "lax",
      secure: false,
      expires: new Date(0),
      path: "/"
    });
  }
}
