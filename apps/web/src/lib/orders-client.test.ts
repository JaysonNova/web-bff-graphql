import { describe, expect, it } from "vitest";

import { createSessionStore } from "./session-store";
import { queryOrdersForSession } from "./orders-client";

describe("queryOrdersForSession", () => {
  it("rejects when no authenticated session exists", async () => {
    const store = createSessionStore();

    await expect(
      queryOrdersForSession({
        sessionId: "missing",
        store,
        graphqlEndpoint: "http://localhost:4000/graphql",
        fetchImpl: fetch,
        createInternalToken: async () => "signed-session-token"
      })
    ).rejects.toThrow("UNAUTHENTICATED");
  });

  it("posts a GraphQL request and stores the trace snapshot", async () => {
    const store = createSessionStore();
    const session = await store.create({
      user: {
        id: "user-1",
        name: "Morgan Lee",
        email: "buyer@example.com",
        role: "buyer"
      },
      tokens: {
        accessToken: "access-token",
        idToken: "id-token"
      }
    });

    const response = await queryOrdersForSession({
      sessionId: session.id,
      store,
      graphqlEndpoint: "http://localhost:4000/graphql",
      createInternalToken: async (value) => {
        expect(value.user.id).toBe("user-1");
        return "signed-session-token";
      },
      fetchImpl: async (input, init) => {
        expect(String(input)).toContain("/graphql");
        expect(init?.headers).toMatchObject({
          "content-type": "application/json",
          authorization: "Bearer signed-session-token"
        });

        return new Response(
          JSON.stringify({
            data: {
              orders: [
                {
                  id: "order-1001",
                  status: "fulfilled",
                  createdAt: "2026-04-08T09:30:00.000Z",
                  customerName: "Morgan Lee",
                  itemCount: 2,
                  total: 328
                }
              ]
            },
            extensions: {
              bffTrace: {
                operationName: "OrdersList",
                generatedAt: "2026-04-10T12:00:00.000Z",
                status: "ok",
                resultSummary: "1 orders",
                downstream: [
                  {
                    service: "orders",
                    path: "/orders?userId=user-1",
                    status: "ok",
                    durationMs: 3
                  }
                ]
              }
            }
          }),
          {
            headers: {
              "content-type": "application/json"
            }
          }
        );
      }
    });

    expect(response && "orders" in response && response.orders).toHaveLength(1);
    expect((await store.get(session.id))?.lastTrace?.operationName).toBe("OrdersList");
    expect(((await store.get(session.id))?.lastTrace as { status?: string } | null)?.status).toBe("ok");
  });

  it("prefers GraphQL error codes over raw messages", async () => {
    const store = createSessionStore();
    const session = await store.create({
      user: {
        id: "user-1",
        name: "Morgan Lee",
        email: "buyer@example.com",
        role: "buyer"
      },
      tokens: {
        accessToken: "access-token",
        idToken: "id-token"
      }
    });

    await expect(
      queryOrdersForSession({
        sessionId: session.id,
        store,
        graphqlEndpoint: "http://localhost:4000/graphql",
        createInternalToken: async () => "signed-session-token",
        fetchImpl: async () =>
          new Response(
            JSON.stringify({
              errors: [
                {
                  message: "hidden implementation detail",
                  extensions: {
                    code: "FORBIDDEN"
                  }
                }
              ]
            }),
            {
              headers: {
                "content-type": "application/json"
              }
            }
          )
      })
    ).rejects.toThrow("FORBIDDEN");
  });
});
