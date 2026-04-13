import { describe, expect, it } from "vitest";

import { createAuthRequestStore } from "./auth-request-store";

describe("createAuthRequestStore", () => {
  it("creates and consumes stateful login requests", () => {
    const store = createAuthRequestStore();
    const request = store.create({
      redirectPath: "/orders"
    });

    expect(request.codeVerifier).toMatch(/^[A-Za-z0-9_-]{43,128}$/);
    expect(store.consume(request.state)).toEqual(request);
    expect(store.consume(request.state)).toBeNull();
  });

  it("expires stale login requests", () => {
    let now = new Date("2026-04-09T10:00:00.000Z");
    const store = createAuthRequestStore({
      ttlMs: 1_000,
      now: () => now
    });
    const request = store.create({
      redirectPath: "/orders"
    });

    now = new Date("2026-04-09T10:00:02.000Z");

    expect(store.consume(request.state)).toBeNull();
  });
});
