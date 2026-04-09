import { describe, expect, it } from "vitest";

import { createProviderCore } from "./provider-core";

describe("createProviderCore", () => {
  it("creates an authorization code and exchanges it for tokens", async () => {
    const provider = createProviderCore({
      issuer: "http://localhost:4001",
      clientId: "web-bff",
      clientSecret: "super-secret",
      jwtSecret: "jwt-secret"
    });

    const redirect = provider.authorize({
      clientId: "web-bff",
      redirectUri: "http://localhost:3000/api/auth/callback",
      state: "state-123",
      nonce: "nonce-123"
    });

    const redirectUrl = new URL(redirect);
    const code = redirectUrl.searchParams.get("code");

    expect(code).toBeTruthy();
    expect(redirectUrl.searchParams.get("state")).toBe("state-123");

    const tokenResponse = await provider.exchange({
      code: code ?? "",
      clientId: "web-bff",
      clientSecret: "super-secret",
      redirectUri: "http://localhost:3000/api/auth/callback"
    });

    expect(tokenResponse.token_type).toBe("Bearer");
    expect(tokenResponse.access_token).toBeTruthy();

    const claims = await provider.verifyIdToken(tokenResponse.id_token);
    expect(claims.sub).toBe("user-1");
    expect(claims.email).toBe("buyer@example.com");
  });

  it("rejects invalid client credentials during token exchange", async () => {
    const provider = createProviderCore({
      issuer: "http://localhost:4001",
      clientId: "web-bff",
      clientSecret: "super-secret",
      jwtSecret: "jwt-secret"
    });

    const redirect = provider.authorize({
      clientId: "web-bff",
      redirectUri: "http://localhost:3000/api/auth/callback",
      state: "state-123",
      nonce: "nonce-123"
    });
    const code = new URL(redirect).searchParams.get("code") ?? "";

    await expect(
      provider.exchange({
        code,
        clientId: "web-bff",
        clientSecret: "wrong-secret",
        redirectUri: "http://localhost:3000/api/auth/callback"
      })
    ).rejects.toThrow("invalid_client");
  });
});
