import { NextResponse } from "next/server";

export function setNoStore(response: NextResponse) {
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export function jsonNoStore(body: unknown, init?: ResponseInit) {
  const response = NextResponse.json(body, init);
  response.headers.set("Cache-Control", "no-store");
  return response;
}
