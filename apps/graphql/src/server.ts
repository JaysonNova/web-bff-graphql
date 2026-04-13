import { createServer } from "node:http";

import { createSchema, createYoga } from "graphql-yoga";
import { GraphQLError } from "graphql";

import { SERVICE_PORTS, toViewer, type DemoInventory, type DemoOrder, type DemoProduct, type DemoUser, type ServiceTrace } from "@demo/contracts";

import { aggregateOrderDetail, aggregateOrderSummaries } from "./lib/aggregate-orders";
import { verifyInternalSessionToken } from "./lib/internal-session-token";

type AppContext = {
  userId: string;
  trace: ServiceTrace[];
  services: {
    usersUrl: string;
    ordersUrl: string;
    catalogUrl: string;
  };
};

async function fetchJson<T>(service: string, baseUrl: string, path: string, trace: ServiceTrace[]) {
  const startedAt = Date.now();
  const response = await fetch(new URL(path, baseUrl), {
    headers: {
      accept: "application/json"
    }
  });
  const durationMs = Date.now() - startedAt;

  if (!response.ok) {
    const message = await response.text();
    trace.push({
      service,
      path,
      status: "error",
      durationMs,
      detail: message
    });
    throw new Error(`${service} request failed: ${response.status}`);
  }

  const data = (await response.json()) as T;

  trace.push({
    service,
    path,
    status: "ok",
    durationMs
  });

  return data;
}

const usersUrl = process.env.USERS_URL ?? `http://localhost:${SERVICE_PORTS.users}`;
const ordersUrl = process.env.ORDERS_URL ?? `http://localhost:${SERVICE_PORTS.orders}`;
const catalogUrl = process.env.CATALOG_URL ?? `http://localhost:${SERVICE_PORTS.catalog}`;
const internalJwtIssuer = process.env.INTERNAL_JWT_ISSUER ?? "web-bff";
const internalJwtAudience = process.env.INTERNAL_JWT_AUDIENCE ?? "graphql";
const internalJwtSecret = process.env.INTERNAL_JWT_SECRET ?? "internal-jwt-secret";
const port = Number(process.env.PORT ?? SERVICE_PORTS.graphql);

const yoga = createYoga<AppContext>({
  schema: createSchema({
    typeDefs: /* GraphQL */ `
      type Viewer {
        id: ID!
        name: String!
        email: String!
        role: String!
      }

      type Inventory {
        productId: ID!
        inStock: Int!
        warehouse: String!
      }

      type OrderItem {
        productId: ID!
        productName: String!
        category: String!
        quantity: Int!
        unitPrice: Int!
        inventory: Inventory
      }

      type OrderSummary {
        id: ID!
        status: String!
        createdAt: String!
        customerName: String!
        itemCount: Int!
        total: Int!
      }

      type OrderDetail {
        id: ID!
        status: String!
        createdAt: String!
        customer: Viewer!
        items: [OrderItem!]!
        total: Int!
      }

      type Query {
        viewer: Viewer!
        orders: [OrderSummary!]!
        order(id: ID!): OrderDetail
      }
    `,
    resolvers: {
      Query: {
        async viewer(_, __, context) {
          if (!context.userId) {
            throw new GraphQLError("UNAUTHENTICATED");
          }

          const user = await fetchJson<DemoUser>("users", context.services.usersUrl, `/users/${context.userId}`, context.trace);
          return toViewer(user);
        },

        async orders(_, __, context) {
          if (!context.userId) {
            throw new GraphQLError("UNAUTHENTICATED");
          }

          const orders = await fetchJson<DemoOrder[]>(
            "orders",
            context.services.ordersUrl,
            `/orders?userId=${context.userId}`,
            context.trace
          );

          return aggregateOrderSummaries(orders, {
            trace: {
              downstream: context.trace,
              push(entry) {
                context.trace.push(entry);
              }
            },
            loadUser(userId) {
              return fetchJson<DemoUser>("users", context.services.usersUrl, `/users/${userId}`, []);
            }
          });
        },

        async order(_, args: { id: string }, context) {
          if (!context.userId) {
            throw new GraphQLError("UNAUTHENTICATED");
          }

          const order = await fetchJson<DemoOrder>(
            "orders",
            context.services.ordersUrl,
            `/orders/${args.id}`,
            context.trace
          );

          if (order.userId !== context.userId) {
            throw new GraphQLError("FORBIDDEN");
          }

          return aggregateOrderDetail(order, {
            trace: {
              downstream: context.trace,
              push(entry) {
                context.trace.push(entry);
              }
            },
            loadUser(userId) {
              return fetchJson<DemoUser>("users", context.services.usersUrl, `/users/${userId}`, []);
            },
            loadProduct(productId) {
              return fetchJson<DemoProduct>("catalog", context.services.catalogUrl, `/products/${productId}`, []);
            },
            loadInventory(productId) {
              return fetchJson<DemoInventory>("catalog", context.services.catalogUrl, `/inventory/${productId}`, []);
            }
          });
        }
      }
    }
  }),
  context: async ({ request }) => {
    const authorization = request.headers.get("authorization") ?? "";
    const bearerToken = authorization.replace(/^Bearer\s+/i, "");
    let userId = "";

    if (bearerToken) {
      try {
        const claims = await verifyInternalSessionToken(bearerToken, {
          issuer: internalJwtIssuer,
          audience: internalJwtAudience,
          secret: internalJwtSecret
        });
        userId = claims.userId;
      } catch {
        userId = "";
      }
    }

    return {
      userId,
      trace: [],
      services: {
        usersUrl,
        ordersUrl,
        catalogUrl
      }
    };
  },
  plugins: [
    {
      onExecute() {
        return {
          onExecuteDone({
            args,
            result,
            setResult
          }: {
            args: { contextValue: AppContext };
            result: Record<string, unknown> | AsyncIterable<unknown>;
            setResult(nextResult: Record<string, unknown>): void;
          }) {
            if (Symbol.asyncIterator in Object(result)) {
              return;
            }

            const singleResult = result as Record<string, unknown> & {
              extensions?: Record<string, unknown>;
            };

            setResult({
              ...singleResult,
              extensions: {
                ...(singleResult.extensions ?? {}),
                trace: args.contextValue.trace
              }
            });
          }
        };
      }
    }
  ],
  graphqlEndpoint: "/graphql"
});

createServer(yoga).listen(port, () => {
  console.log(`graphql service listening on http://localhost:${port}/graphql`);
});
