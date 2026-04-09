import { jwtVerify } from "jose";

import type { SessionUser } from "@demo/contracts";

import { webEnv } from "./env";

function secretKey() {
  return new TextEncoder().encode(webEnv.oidcJwtSecret);
}

export function buildAuthorizationUrl(input: { state: string; nonce: string }) {
  const url = new URL("/authorize", webEnv.oidcIssuer);
  url.searchParams.set("client_id", webEnv.oidcClientId);
  url.searchParams.set("redirect_uri", webEnv.oidcRedirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid profile");
  url.searchParams.set("state", input.state);
  url.searchParams.set("nonce", input.nonce);
  return url.toString();
}

export async function exchangeCodeForTokens(code: string) {
  const response = await fetch(new URL("/token", webEnv.oidcIssuer), {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      client_id: webEnv.oidcClientId,
      client_secret: webEnv.oidcClientSecret,
      redirect_uri: webEnv.oidcRedirectUri
    }).toString()
  });

  if (!response.ok) {
    throw new Error("OIDC_TOKEN_EXCHANGE_FAILED");
  }

  return (await response.json()) as {
    access_token: string;
    id_token: string;
    token_type: string;
    expires_in: number;
  };
}

export async function userFromIdToken(idToken: string): Promise<SessionUser> {
  const { payload } = await jwtVerify(idToken, secretKey(), {
    issuer: webEnv.oidcIssuer,
    audience: webEnv.oidcClientId
  });

  return {
    id: String(payload.sub),
    name: String(payload.name),
    email: String(payload.email),
    role: String(payload.role ?? "buyer")
  };
}
