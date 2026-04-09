import { describe, expect, it } from "vitest";

import { createAuthRequestStore } from "./auth-request-store";

describe("createAuthRequestStore", () => {
  it("creates and consumes stateful login requests", () => {
    const store = createAuthRequestStore();
    const request = store.create({
      redirectPath: "/orders"
    });

    expect(store.consume(request.state)).toEqual(request);
    expect(store.consume(request.state)).toBeNull();
  });
});
