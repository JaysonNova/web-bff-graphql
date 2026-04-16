import type { BffTraceExtension } from "@demo/contracts";
import type { GraphqlConfig } from "./config.js";

import { verifyInternalSessionToken } from "./lib/internal-session-token.js";

type AuthClaims = {
  userId: string;
  role: string;
  sessionId: string;
};

type RequestLike = {
  body?: {
    operationName?: unknown;
  };
  header(name: string): string | undefined;
};

export type GraphqlContext = {
  auth: AuthClaims | null;
  fetchImpl: typeof fetch;
  services: {
    usersUrl: string;
    ordersUrl: string;
    catalogUrl: string;
  };
  trace: BffTraceExtension;
};

type CreateGraphqlContextInput = {
  config: GraphqlConfig;
  fetchImpl: typeof fetch;
  request: RequestLike;
};

function readOperationName(request: RequestLike) {
  const requestBody = request.body;
  return typeof requestBody?.operationName === "string" && requestBody.operationName
    ? requestBody.operationName
    : "AnonymousOperation";
}

async function readAuthClaims(request: RequestLike, config: GraphqlConfig) {
  const authorization = request.header("authorization") ?? "";
  const bearerToken = authorization.replace(/^Bearer\s+/i, "");

  if (!bearerToken) {
    return null;
  }

  try {
    return await verifyInternalSessionToken(bearerToken, {
      issuer: config.internalJwtIssuer,
      audience: config.internalJwtAudience,
      secret: config.internalJwtSecret
    });
  } catch {
    return null;
  }
}

export async function createGraphqlContext(input: CreateGraphqlContextInput): Promise<GraphqlContext> {
  return {
    auth: await readAuthClaims(input.request, input.config),
    fetchImpl: input.fetchImpl,
    services: {
      usersUrl: input.config.usersUrl,
      ordersUrl: input.config.ordersUrl,
      catalogUrl: input.config.catalogUrl
    },
    trace: {
      operationName: readOperationName(input.request),
      generatedAt: new Date().toISOString(),
      status: "ok",
      downstream: [],
      resultSummary: ""
    }
  };
}
