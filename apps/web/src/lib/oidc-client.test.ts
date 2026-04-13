import { SignJWT } from "jose";
import { describe, expect, it } from "vitest";

import { buildAuthorizationUrl, userFromIdToken } from "./oidc-client";

async function signIdToken(input: { nonce: string }) {
  return new SignJWT({
    email: "buyer@example.com",
    name: "Morgan Lee",
    role: "buyer",
    nonce: input.nonce
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer("http://localhost:4001")
    .setAudience("web-bff")
    .setSubject("user-1")
    .setIssuedAt()
    .setExpirationTime("30m")
    .sign(new TextEncoder().encode("jwt-secret"));
}

describe("buildAuthorizationUrl", () => {
  it("includes PKCE and nonce parameters", () => {
    const url = new URL(
      buildAuthorizationUrl({
        state: "state-123",
        nonce: "nonce-123",
        codeChallenge: "challenge-123"
      })
    );

    expect(url.searchParams.get("state")).toBe("state-123");
    expect(url.searchParams.get("nonce")).toBe("nonce-123");
    expect(url.searchParams.get("code_challenge")).toBe("challenge-123");
    expect(url.searchParams.get("code_challenge_method")).toBe("S256");
  });
});

describe("userFromIdToken", () => {
  it("returns the session user when the nonce matches", async () => {
    const idToken = await signIdToken({
      nonce: "nonce-123"
    });

    await expect(
      userFromIdToken(idToken, {
        expectedNonce: "nonce-123"
      })
    ).resolves.toEqual({
      id: "user-1",
      name: "Morgan Lee",
      email: "buyer@example.com",
      role: "buyer"
    });
  });

  it("rejects the callback when the ID token nonce does not match", async () => {
    const idToken = await signIdToken({
      nonce: "nonce-123"
    });

    await expect(
      userFromIdToken(idToken, {
        expectedNonce: "nonce-999"
      })
    ).rejects.toThrow("OIDC_NONCE_MISMATCH");
  });
});
