import { SignJWT } from "jose";

import type { SessionRecord } from "./session-store";

import { webEnv } from "./env";

export async function createInternalSessionToken(session: SessionRecord) {
  return new SignJWT({
    role: session.user.role,
    sid: session.id
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer(webEnv.internalJwtIssuer)
    .setAudience(webEnv.internalJwtAudience)
    .setSubject(session.user.id)
    .setIssuedAt()
    .setExpirationTime("60s")
    .sign(new TextEncoder().encode(webEnv.internalJwtSecret));
}
