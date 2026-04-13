import { jwtVerify } from "jose";

type VerifyInternalSessionTokenOptions = {
  issuer: string;
  audience: string;
  secret: string;
};

export async function verifyInternalSessionToken(token: string, options: VerifyInternalSessionTokenOptions) {
  const { payload } = await jwtVerify(token, new TextEncoder().encode(options.secret), {
    issuer: options.issuer,
    audience: options.audience
  });

  return {
    userId: String(payload.sub),
    role: String(payload.role ?? "buyer"),
    sessionId: String(payload.sid)
  };
}
