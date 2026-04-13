import { describe, expect, it } from "vitest";

import { sanitizeRedirectPath } from "./safe-redirect";

describe("sanitizeRedirectPath", () => {
  it("keeps allowlisted relative routes", () => {
    expect(sanitizeRedirectPath("/orders")).toBe("/orders");
    expect(sanitizeRedirectPath("/orders/order-1001")).toBe("/orders/order-1001");
    expect(sanitizeRedirectPath("/trace")).toBe("/trace");
  });

  it("falls back to the default route for unsafe targets", () => {
    expect(sanitizeRedirectPath("https://evil.example")).toBe("/orders");
    expect(sanitizeRedirectPath("//evil.example")).toBe("/orders");
    expect(sanitizeRedirectPath("/admin")).toBe("/orders");
    expect(sanitizeRedirectPath("javascript:alert(1)")).toBe("/orders");
  });
});
