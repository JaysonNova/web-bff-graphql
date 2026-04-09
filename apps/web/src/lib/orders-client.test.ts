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
        fetchImpl: fetch
      })
    ).rejects.toThrow("UNAUTHENTICATED");
  });

  it("posts a GraphQL request and stores the trace snapshot", async () => {
    const store = createSessionStore();
    const session = store.create({
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
      fetchImpl: async (input, init) => {
        expect(String(input)).toContain("/graphql");
        expect(init?.headers).toMatchObject({
          "content-type": "application/json",
          "x-demo-user-id": "user-1"
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
              trace: [
                {
                  service: "orders",
                  path: "/orders?userId=user-1",
                  status: "ok",
                  durationMs: 3
                }
              ]
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
    expect(store.get(session.id)?.lastTrace?.operationName).toBe("OrdersList");
  });
});
