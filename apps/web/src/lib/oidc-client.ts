import { createHash } from "node:crypto";

import { jwtVerify } from "jose";

import type { SessionUser } from "@demo/contracts";

import { webEnv } from "./env";

function secretKey() {
  return new TextEncoder().encode(webEnv.oidcJwtSecret);
}

export function buildAuthorizationUrl(input: { state: string; nonce: string; codeChallenge: string }) {
  const url = new URL("/authorize", webEnv.oidcPublicIssuer);
  url.searchParams.set("client_id", webEnv.oidcClientId);
  url.searchParams.set("redirect_uri", webEnv.oidcRedirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid profile");
  url.searchParams.set("state", input.state);
  url.searchParams.set("nonce", input.nonce);
  url.searchParams.set("code_challenge", input.codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");
  return url.toString();
}

export function buildCodeChallenge(codeVerifier: string) {
  return createHash("sha256").update(codeVerifier).digest("base64url");
}

export async function exchangeCodeForTokens(input: { code: string; codeVerifier: string }) {
  const response = await fetch(new URL("/token", webEnv.oidcInternalIssuer), {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code: input.code,
      client_id: webEnv.oidcClientId,
      client_secret: webEnv.oidcClientSecret,
      redirect_uri: webEnv.oidcRedirectUri,
      code_verifier: input.codeVerifier
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

export async function userFromIdToken(
  idToken: string,
  input: {
    expectedNonce: string;
  }
): Promise<SessionUser> {
  const { payload } = await jwtVerify(idToken, secretKey(), {
    issuer: webEnv.oidcPublicIssuer,
    audience: webEnv.oidcClientId
  });

  if (String(payload.nonce ?? "") !== input.expectedNonce) {
    throw new Error("OIDC_NONCE_MISMATCH");
  }

  return {
    id: String(payload.sub),
    name: String(payload.name),
    email: String(payload.email),
    role: String(payload.role ?? "buyer")
  };
}
