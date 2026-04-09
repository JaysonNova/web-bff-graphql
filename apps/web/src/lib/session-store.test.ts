import { describe, expect, it } from "vitest";

import { createSessionStore } from "./session-store";

describe("createSessionStore", () => {
  it("creates sessions and stores the latest trace snapshot", () => {
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

    store.updateTrace(session.id, {
      operationName: "OrdersList",
      generatedAt: "2026-04-09T10:00:00.000Z",
      downstream: [],
      resultSummary: "2 orders"
    });

    expect(store.get(session.id)?.lastTrace?.resultSummary).toBe("2 orders");
  });

  it("clears sessions by id", () => {
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

    store.clear(session.id);

    expect(store.get(session.id)).toBeNull();
  });
});
