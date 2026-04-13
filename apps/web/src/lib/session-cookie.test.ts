import { NextResponse } from "next/server";
import { describe, expect, it } from "vitest";

import { buildSessionCookieName, clearSessionCookie, writeSessionCookie } from "./session-cookie";

describe("session cookies", () => {
  it("uses the __Host- prefix when secure cookies are enabled", () => {
    expect(buildSessionCookieName(true)).toBe("__Host-bff_session");
    expect(buildSessionCookieName(false)).toBe("bff_session");
  });

  it("writes secure cookie attributes for https deployments", () => {
    const response = NextResponse.next();

    writeSessionCookie(response, "session-123", {
      secure: true
    });

    const cookie = response.cookies.get("__Host-bff_session");

    expect(cookie?.value).toBe("session-123");
    expect(cookie?.httpOnly).toBe(true);
    expect(cookie?.secure).toBe(true);
  });

  it("clears the cookie using the matching name", () => {
    const response = NextResponse.next();

    clearSessionCookie(response, {
      secure: true
    });

    expect(response.cookies.get("__Host-bff_session")?.value).toBe("");
  });
});
