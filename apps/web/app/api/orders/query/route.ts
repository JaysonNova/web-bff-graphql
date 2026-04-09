import { NextResponse } from "next/server";

import { webEnv } from "@/src/lib/env";
import { queryOrdersForSession } from "@/src/lib/orders-client";
import { readSessionId } from "@/src/lib/session-cookie";
import { sessionStore } from "@/src/lib/stores";

export async function POST(request: import("next/server").NextRequest) {
  const sessionId = readSessionId(request);

  if (!sessionId) {
    return NextResponse.json({ message: "UNAUTHENTICATED" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as { orderId?: string };

  try {
    const result = await queryOrdersForSession({
      sessionId,
      orderId: body.orderId,
      store: sessionStore,
      graphqlEndpoint: webEnv.graphqlEndpoint,
      fetchImpl: fetch
    });

    if (body.orderId) {
      return NextResponse.json({ order: result });
    }

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    const status = message === "UNAUTHENTICATED" ? 401 : 500;

    return NextResponse.json({ message }, { status });
  }
}
