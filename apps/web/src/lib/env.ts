import { SERVICE_PORTS } from "@demo/contracts";

const appBaseUrl = process.env.APP_BASE_URL ?? `http://localhost:${SERVICE_PORTS.web}`;
const oidcIssuer = process.env.OIDC_ISSUER ?? `http://localhost:${SERVICE_PORTS.oidc}`;

export const webEnv = {
  appBaseUrl,
  graphqlEndpoint: process.env.GRAPHQL_ENDPOINT ?? `http://localhost:${SERVICE_PORTS.graphql}/graphql`,
  oidcIssuer,
  oidcClientId: process.env.OIDC_CLIENT_ID ?? "web-bff",
  oidcClientSecret: process.env.OIDC_CLIENT_SECRET ?? "super-secret",
  oidcJwtSecret: process.env.OIDC_JWT_SECRET ?? "jwt-secret",
  oidcRedirectUri: `${appBaseUrl}/api/auth/callback`
};
