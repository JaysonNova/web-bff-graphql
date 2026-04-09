import { SignJWT, jwtVerify } from "jose";

import { DEMO_USER } from "@demo/contracts";

type ProviderCoreOptions = {
  issuer: string;
  clientId: string;
  clientSecret: string;
  jwtSecret: string;
};

type AuthorizationInput = {
  clientId: string;
  redirectUri: string;
  state: string;
  nonce: string;
};

type ExchangeInput = {
  code: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
};

type AuthorizationCodeRecord = {
  clientId: string;
  redirectUri: string;
  nonce: string;
  userId: string;
};

function secretKey(secret: string) {
  return new TextEncoder().encode(secret);
}

export function createProviderCore(options: ProviderCoreOptions) {
  const authorizationCodes = new Map<string, AuthorizationCodeRecord>();
  const accessTokens = new Map<string, string>();

  return {
    authorize(input: AuthorizationInput) {
      if (input.clientId !== options.clientId) {
        throw new Error("invalid_client");
      }

      const code = crypto.randomUUID();

      authorizationCodes.set(code, {
        clientId: input.clientId,
        redirectUri: input.redirectUri,
        nonce: input.nonce,
        userId: DEMO_USER.id
      });

      const redirect = new URL(input.redirectUri);
      redirect.searchParams.set("code", code);
      redirect.searchParams.set("state", input.state);

      return redirect.toString();
    },

    async exchange(input: ExchangeInput) {
      if (input.clientId !== options.clientId || input.clientSecret !== options.clientSecret) {
        throw new Error("invalid_client");
      }

      const codeRecord = authorizationCodes.get(input.code);

      if (!codeRecord || codeRecord.redirectUri !== input.redirectUri) {
        throw new Error("invalid_grant");
      }

      authorizationCodes.delete(input.code);

      const accessToken = crypto.randomUUID();
      accessTokens.set(accessToken, codeRecord.userId);

      const issuedAt = Math.floor(Date.now() / 1000);
      const idToken = await new SignJWT({
        email: DEMO_USER.email,
        name: DEMO_USER.name,
        role: DEMO_USER.role,
        nonce: codeRecord.nonce
      })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuer(options.issuer)
        .setAudience(options.clientId)
        .setSubject(DEMO_USER.id)
        .setIssuedAt(issuedAt)
        .setExpirationTime(issuedAt + 60 * 30)
        .sign(secretKey(options.jwtSecret));

      return {
        access_token: accessToken,
        id_token: idToken,
        token_type: "Bearer" as const,
        expires_in: 1800
      };
    },

    async verifyIdToken(idToken: string) {
      const { payload } = await jwtVerify(idToken, secretKey(options.jwtSecret), {
        issuer: options.issuer,
        audience: options.clientId
      });

      return {
        sub: String(payload.sub),
        email: String(payload.email),
        name: String(payload.name),
        role: String(payload.role)
      };
    },

    getUserInfo(accessToken: string) {
      const userId = accessTokens.get(accessToken);

      if (!userId) {
        throw new Error("invalid_token");
      }

      return {
        sub: DEMO_USER.id,
        email: DEMO_USER.email,
        name: DEMO_USER.name
      };
    }
  };
}
