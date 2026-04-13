import { describe, expect, it } from "vitest";

import { createSessionStore } from "./session-store";

describe("createSessionStore", () => {
  it("creates sessions, refreshes idle expiry, and stores the latest trace snapshot", async () => {
    let now = new Date("2026-04-09T10:00:00.000Z");
    const store = createSessionStore({
      now: () => now,
      idleTimeoutMs: 10_000,
      absoluteTimeoutMs: 60_000
    });
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

    expect(session.idleExpiresAt).toBe("2026-04-09T10:00:10.000Z");
    expect(session.absoluteExpiresAt).toBe("2026-04-09T10:01:00.000Z");

    now = new Date("2026-04-09T10:00:05.000Z");
    const refreshed = await store.get(session.id);

    expect(refreshed?.lastSeenAt).toBe("2026-04-09T10:00:05.000Z");
    expect(refreshed?.idleExpiresAt).toBe("2026-04-09T10:00:15.000Z");

    await store.updateTrace(session.id, {
      operationName: "OrdersList",
      generatedAt: "2026-04-09T10:00:00.000Z",
      downstream: [],
      resultSummary: "2 orders"
    });

    expect((await store.get(session.id))?.lastTrace?.resultSummary).toBe("2 orders");
  });

  it("clears sessions by id", async () => {
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

    await store.clear(session.id);

    expect(await store.get(session.id)).toBeNull();
  });

  it("expires idle sessions", async () => {
    let now = new Date("2026-04-09T10:00:00.000Z");
    const store = createSessionStore({
      now: () => now,
      idleTimeoutMs: 1_000,
      absoluteTimeoutMs: 60_000
    });
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

    now = new Date("2026-04-09T10:00:02.000Z");

    expect(await store.get(session.id)).toBeNull();
  });
});
