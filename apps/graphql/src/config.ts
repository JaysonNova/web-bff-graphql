import { SERVICE_PORTS } from "@demo/contracts";

export type GraphqlConfig = {
  port: number;
  usersUrl: string;
  ordersUrl: string;
  catalogUrl: string;
  internalJwtIssuer: string;
  internalJwtAudience: string;
  internalJwtSecret: string;
  graphqlPath: string;
  enableSandbox: boolean;
  enableIntrospection: boolean;
  apolloKey: string;
  apolloGraphRef: string;
};

function readBoolean(value: string | undefined, fallback = false) {
  if (value === undefined) {
    return fallback;
  }

  return value === "true";
}

export function loadGraphqlConfig(env: NodeJS.ProcessEnv = process.env): GraphqlConfig {
  return {
    port: Number(env.PORT ?? SERVICE_PORTS.graphql),
    usersUrl: env.USERS_URL ?? `http://localhost:${SERVICE_PORTS.users}`,
    ordersUrl: env.ORDERS_URL ?? `http://localhost:${SERVICE_PORTS.orders}`,
    catalogUrl: env.CATALOG_URL ?? `http://localhost:${SERVICE_PORTS.catalog}`,
    internalJwtIssuer: env.INTERNAL_JWT_ISSUER ?? "web-bff",
    internalJwtAudience: env.INTERNAL_JWT_AUDIENCE ?? "graphql",
    internalJwtSecret: env.INTERNAL_JWT_SECRET ?? "internal-jwt-secret",
    graphqlPath: env.GRAPHQL_PATH ?? "/graphql",
    enableSandbox: readBoolean(env.GRAPHQL_ENABLE_SANDBOX, false),
    enableIntrospection: readBoolean(env.GRAPHQL_ENABLE_INTROSPECTION, false),
    apolloKey: env.APOLLO_KEY ?? "",
    apolloGraphRef: env.APOLLO_GRAPH_REF ?? ""
  };
}

export function mergeGraphqlConfig(overrides: Partial<GraphqlConfig> = {}) {
  return {
    ...loadGraphqlConfig(),
    ...overrides
  };
}
