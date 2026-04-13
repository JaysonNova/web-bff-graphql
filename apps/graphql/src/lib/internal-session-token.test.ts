import { SignJWT } from "jose";
import { describe, expect, it } from "vitest";

import { verifyInternalSessionToken } from "./internal-session-token";

async function signToken(input: { audience?: string; expiresIn?: string }) {
  return new SignJWT({
    role: "buyer",
    sid: "session-123"
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer("web-bff")
    .setAudience(input.audience ?? "graphql")
    .setSubject("user-1")
    .setIssuedAt()
    .setExpirationTime(input.expiresIn ?? "10m")
    .sign(new TextEncoder().encode("internal-jwt-secret"));
}

describe("verifyInternalSessionToken", () => {
  it("accepts valid BFF-issued session tokens", async () => {
    const token = await signToken({});

    await expect(
      verifyInternalSessionToken(token, {
        issuer: "web-bff",
        audience: "graphql",
        secret: "internal-jwt-secret"
      })
    ).resolves.toEqual({
      userId: "user-1",
      role: "buyer",
      sessionId: "session-123"
    });
  });

  it("rejects tokens with the wrong audience", async () => {
    const token = await signToken({
      audience: "orders"
    });

    await expect(
      verifyInternalSessionToken(token, {
        issuer: "web-bff",
        audience: "graphql",
        secret: "internal-jwt-secret"
      })
    ).rejects.toThrow();
  });
});
