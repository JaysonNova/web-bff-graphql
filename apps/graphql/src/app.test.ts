import { DEMO_ORDERS, DEMO_PRODUCTS, DEMO_USER, type DemoInventory, type DemoOrder, type DemoProduct, type DemoUser } from "@demo/contracts";
import { SignJWT } from "jose";
import { afterEach, describe, expect, it } from "vitest";

import { createGraphqlApp } from "./app";

type RunningApp = Awaited<ReturnType<typeof createGraphqlApp>>;

const runningApps: RunningApp[] = [];

afterEach(async () => {
  while (runningApps.length > 0) {
    const app = runningApps.pop();

    if (app) {
      await app.stop();
    }
  }
});

async function signInternalToken(userId = "user-1") {
  return new SignJWT({
    role: "buyer",
    sid: "session-123"
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer("web-bff")
    .setAudience("graphql")
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime("10m")
    .sign(new TextEncoder().encode("internal-jwt-secret"));
}

function createFetchImpl(overrides: {
  users?: Record<string, DemoUser>;
  orders?: DemoOrder[];
  products?: Record<string, DemoProduct>;
  inventory?: Record<string, DemoInventory>;
}) {
  const users = overrides.users ?? {
    [DEMO_USER.id]: DEMO_USER
  };
  const orders = overrides.orders ?? DEMO_ORDERS;
  const products = overrides.products ?? DEMO_PRODUCTS;
  const inventory = overrides.inventory ?? {};

  return async (input: RequestInfo | URL) => {
    const url = new URL(String(input));

    if (url.pathname.startsWith("/users/")) {
      const userId = url.pathname.split("/").at(-1) ?? "";
      const user = users[userId];

      return user
        ? Response.json(user)
        : Response.json({ message: "user not found" }, { status: 404 });
    }

    if (url.pathname === "/orders") {
      const userId = url.searchParams.get("userId");
      return Response.json(orders.filter((order) => order.userId === userId));
    }

    if (url.pathname.startsWith("/orders/")) {
      const orderId = url.pathname.split("/").at(-1) ?? "";
      const order = orders.find((entry) => entry.id === orderId);

      return order
        ? Response.json(order)
        : Response.json({ message: "order not found" }, { status: 404 });
    }

    if (url.pathname.startsWith("/products/")) {
      const productId = url.pathname.split("/").at(-1) ?? "";
      const product = products[productId];

      return product
        ? Response.json(product)
        : Response.json({ message: "product not found" }, { status: 404 });
    }

    if (url.pathname.startsWith("/inventory/")) {
      const productId = url.pathname.split("/").at(-1) ?? "";

      if (productId === "prod-2") {
        return Response.json(
          {
            message: "inventory lookup is temporarily unavailable for prod-2"
          },
          { status: 503 }
        );
      }

      const inventoryEntry = inventory[productId];

      return inventoryEntry
        ? Response.json(inventoryEntry)
        : Response.json({ message: "inventory not found" }, { status: 404 });
    }

    return Response.json({ message: "unexpected url" }, { status: 500 });
  };
}

async function startApp(fetchImpl = createFetchImpl({})) {
  const app = await createGraphqlApp({
    config: {
      usersUrl: "http://users.internal",
      ordersUrl: "http://orders.internal",
      catalogUrl: "http://catalog.internal",
      internalJwtIssuer: "web-bff",
      internalJwtAudience: "graphql",
      internalJwtSecret: "internal-jwt-secret",
      graphqlPath: "/graphql",
      enableSandbox: false,
      enableIntrospection: false,
      apolloKey: "",
      apolloGraphRef: ""
    },
    fetchImpl
  });

  runningApps.push(app);
  return app;
}

describe("createGraphqlApp", () => {
  it("serves health and readiness endpoints", async () => {
    const app = await startApp();

    expect(app.healthcheck()).toEqual({
      ok: true,
      service: "graphql"
    });
    expect(app.readiness()).toEqual({
      ok: true,
      service: "graphql",
      ready: true
    });
  });

  it("returns partial bffTrace data for degraded order detail queries", async () => {
    const app = await startApp();
    const token = await signInternalToken();

    const result = await app.executeOperation(
      {
        query: `
          query OrderDetail($orderId: ID!) {
            order(id: $orderId) {
              id
              items {
                productId
                inventory {
                  productId
                }
              }
            }
          }
        `,
        variables: {
          orderId: "order-1002"
        },
        operationName: "OrderDetail"
      },
      {
        authorization: `Bearer ${token}`
      }
    );

    if (result.body.kind !== "single") {
      throw new Error("expected single GraphQL result");
    }

    const json = result.body.singleResult as {
      data?: {
        order: {
          id: string;
          items: Array<{
            productId: string;
            inventory: { productId: string } | null;
          }>;
        } | null;
      };
      extensions?: {
        bffTrace?: {
          status: string;
          downstream: Array<{
            service: string;
            path: string;
            status: string;
          }>;
        };
      };
    };

    expect(json.data?.order?.id).toBe("order-1002");
    expect(json.data?.order?.items[0]?.inventory).toBeNull();
    expect(json.extensions?.bffTrace?.status).toBe("partial");
    expect(json.extensions?.bffTrace?.downstream).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          service: "catalog",
          path: "/inventory/prod-2",
          status: "error"
        })
      ])
    );
  });

  it("maps missing auth to a GraphQL UNAUTHENTICATED error code", async () => {
    const app = await startApp();

    const result = await app.executeOperation({
        query: `
          query Viewer {
            viewer {
              id
            }
          }
        `,
        operationName: "Viewer"
    });

    if (result.body.kind !== "single") {
      throw new Error("expected single GraphQL result");
    }

    const json = result.body.singleResult as {
      data?: {
        viewer?: { id: string };
      };
      errors?: Array<{
        extensions?: {
          code?: string;
        };
      }>;
      extensions?: {
        bffTrace?: {
          status: string;
        };
      };
    };

    expect(json.data?.viewer).toBeUndefined();
    expect(json.errors?.[0]?.extensions?.code).toBe("UNAUTHENTICATED");
    expect(json.extensions?.bffTrace?.status).toBe("error");
  });
});
