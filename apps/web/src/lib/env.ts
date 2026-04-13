import { SERVICE_PORTS } from "@demo/contracts";

const appBaseUrl =
  process.env.PUBLIC_APP_BASE_URL ?? process.env.APP_BASE_URL ?? `http://localhost:${SERVICE_PORTS.web}`;
const oidcPublicIssuer =
  process.env.PUBLIC_OIDC_ISSUER ?? process.env.OIDC_ISSUER ?? `http://localhost:${SERVICE_PORTS.oidc}`;
const oidcInternalIssuer =
  process.env.INTERNAL_OIDC_ISSUER ?? process.env.OIDC_ISSUER ?? `http://localhost:${SERVICE_PORTS.oidc}`;

export const webEnv = {
  appBaseUrl,
  graphqlEndpoint: process.env.GRAPHQL_ENDPOINT ?? `http://localhost:${SERVICE_PORTS.graphql}/graphql`,
  oidcPublicIssuer,
  oidcInternalIssuer,
  oidcClientId: process.env.OIDC_CLIENT_ID ?? "web-bff",
  oidcClientSecret: process.env.OIDC_CLIENT_SECRET ?? "super-secret",
  oidcJwtSecret: process.env.OIDC_JWT_SECRET ?? "jwt-secret",
  oidcRedirectUri: `${appBaseUrl}/api/auth/callback`,
  internalJwtIssuer: process.env.INTERNAL_JWT_ISSUER ?? "web-bff",
  internalJwtAudience: process.env.INTERNAL_JWT_AUDIENCE ?? "graphql",
  internalJwtSecret: process.env.INTERNAL_JWT_SECRET ?? "internal-jwt-secret",
  sessionCookieSecure: new URL(appBaseUrl).protocol === "https:",
  enableTraceUi: process.env.ENABLE_TRACE_UI ? process.env.ENABLE_TRACE_UI === "true" : process.env.NODE_ENV !== "production"
};
