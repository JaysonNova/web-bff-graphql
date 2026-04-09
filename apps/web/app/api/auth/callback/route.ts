import { NextResponse } from "next/server";

import { exchangeCodeForTokens, userFromIdToken } from "@/src/lib/oidc-client";
import { writeSessionCookie } from "@/src/lib/session-cookie";
import { authRequestStore, sessionStore } from "@/src/lib/stores";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  if (!code || !state) {
    return NextResponse.redirect(new URL("/login?error=missing_callback_params", request.url));
  }

  const authRequest = authRequestStore.consume(state);

  if (!authRequest) {
    return NextResponse.redirect(new URL("/login?error=invalid_state", request.url));
  }

  try {
    const tokens = await exchangeCodeForTokens(code);
    const user = await userFromIdToken(tokens.id_token);
    const session = sessionStore.create({
      user,
      tokens: {
        accessToken: tokens.access_token,
        idToken: tokens.id_token
      }
    });
    const response = NextResponse.redirect(new URL(authRequest.redirectPath, request.url));

    writeSessionCookie(response, session.id);

    return response;
  } catch {
    return NextResponse.redirect(new URL("/login?error=oidc_callback_failed", request.url));
  }
}
