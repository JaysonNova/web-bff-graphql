import { describe, expect, it } from "vitest";

import { isTrustedMutationRequest } from "./request-security";

function createRequest(input: { headers?: Record<string, string>; url?: string }) {
  return new Request(input.url ?? "http://localhost:3000/api/auth/logout", {
    method: "POST",
    headers: input.headers
  });
}

describe("isTrustedMutationRequest", () => {
  it("accepts requests with a matching origin", () => {
    expect(
      isTrustedMutationRequest(
        createRequest({
          headers: {
            origin: "http://localhost:3000"
          }
        }),
        {
          appBaseUrl: "http://localhost:3000"
        }
      )
    ).toBe(true);
  });

  it("rejects cross-site mutation requests", () => {
    expect(
      isTrustedMutationRequest(
        createRequest({
          headers: {
            origin: "https://evil.example"
          }
        }),
        {
          appBaseUrl: "http://localhost:3000"
        }
      )
    ).toBe(false);
  });

  it("accepts same-origin fetch metadata when origin is missing", () => {
    expect(
      isTrustedMutationRequest(
        createRequest({
          headers: {
            "sec-fetch-site": "same-origin"
          }
        }),
        {
          appBaseUrl: "http://localhost:3000"
        }
      )
    ).toBe(true);
  });
});
