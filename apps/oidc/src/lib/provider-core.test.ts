import { createHash } from "node:crypto";

import { describe, expect, it } from "vitest";

import { createProviderCore } from "./provider-core";

function toCodeChallenge(codeVerifier: string) {
  return createHash("sha256").update(codeVerifier).digest("base64url");
}

describe("createProviderCore", () => {
  it("creates an authorization code and exchanges it for tokens", async () => {
    const codeVerifier = "valid-challenge";
    const provider = createProviderCore({
      issuer: "http://localhost:4001",
      clientId: "web-bff",
      clientSecret: "super-secret",
      jwtSecret: "jwt-secret",
      allowedRedirectUris: ["http://localhost:3000/api/auth/callback"]
    });

    const redirect = provider.authorize({
      clientId: "web-bff",
      redirectUri: "http://localhost:3000/api/auth/callback",
      state: "state-123",
      nonce: "nonce-123",
      codeChallenge: toCodeChallenge(codeVerifier),
      codeChallengeMethod: "S256"
    });

    const redirectUrl = new URL(redirect);
    const code = redirectUrl.searchParams.get("code");

    expect(code).toBeTruthy();
    expect(redirectUrl.searchParams.get("state")).toBe("state-123");

    const tokenResponse = await provider.exchange({
      code: code ?? "",
      clientId: "web-bff",
      clientSecret: "super-secret",
      redirectUri: "http://localhost:3000/api/auth/callback",
      codeVerifier
    });

    expect(tokenResponse.token_type).toBe("Bearer");
    expect(tokenResponse.access_token).toBeTruthy();

    const claims = await provider.verifyIdToken(tokenResponse.id_token);
    expect(claims.sub).toBe("user-1");
    expect(claims.email).toBe("buyer@example.com");
  });

  it("rejects invalid client credentials during token exchange", async () => {
    const codeVerifier = "valid-challenge";
    const provider = createProviderCore({
      issuer: "http://localhost:4001",
      clientId: "web-bff",
      clientSecret: "super-secret",
      jwtSecret: "jwt-secret",
      allowedRedirectUris: ["http://localhost:3000/api/auth/callback"]
    });

    const redirect = provider.authorize({
      clientId: "web-bff",
      redirectUri: "http://localhost:3000/api/auth/callback",
      state: "state-123",
      nonce: "nonce-123",
      codeChallenge: toCodeChallenge(codeVerifier),
      codeChallengeMethod: "S256"
    });
    const code = new URL(redirect).searchParams.get("code") ?? "";

    await expect(
      provider.exchange({
        code,
        clientId: "web-bff",
        clientSecret: "wrong-secret",
        redirectUri: "http://localhost:3000/api/auth/callback",
        codeVerifier
      })
    ).rejects.toThrow("invalid_client");
  });

  it("rejects authorization requests with unregistered redirect URIs", () => {
    const provider = createProviderCore({
      issuer: "http://localhost:4001",
      clientId: "web-bff",
      clientSecret: "super-secret",
      jwtSecret: "jwt-secret",
      allowedRedirectUris: ["http://localhost:3000/api/auth/callback"]
    });

    expect(() =>
      provider.authorize({
        clientId: "web-bff",
        redirectUri: "http://localhost:3000/api/auth/other-callback",
        state: "state-123",
        nonce: "nonce-123",
        codeChallenge: "dmFsaWQtY2hhbGxlbmdl",
        codeChallengeMethod: "S256"
      })
    ).toThrow("invalid_redirect_uri");
  });

  it("rejects token exchange when the PKCE verifier does not match", async () => {
    const codeVerifier = "expected-verifier";
    const provider = createProviderCore({
      issuer: "http://localhost:4001",
      clientId: "web-bff",
      clientSecret: "super-secret",
      jwtSecret: "jwt-secret",
      allowedRedirectUris: ["http://localhost:3000/api/auth/callback"]
    });

    const redirect = provider.authorize({
      clientId: "web-bff",
      redirectUri: "http://localhost:3000/api/auth/callback",
      state: "state-123",
      nonce: "nonce-123",
      codeChallenge: toCodeChallenge(codeVerifier),
      codeChallengeMethod: "S256"
    });
    const code = new URL(redirect).searchParams.get("code") ?? "";

    await expect(
      provider.exchange({
        code,
        clientId: "web-bff",
        clientSecret: "super-secret",
        redirectUri: "http://localhost:3000/api/auth/callback",
        codeVerifier: "wrong-verifier"
      })
    ).rejects.toThrow("invalid_grant");
  });
});
