import { jsonNoStore } from "@/src/lib/response";
import { createInternalSessionToken } from "@/src/lib/internal-session-token";
import { webEnv } from "@/src/lib/env";
import { queryOrdersForSession } from "@/src/lib/orders-client";
import { readSessionId } from "@/src/lib/session-cookie";
import { sessionStore } from "@/src/lib/stores";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(request: import("next/server").NextRequest, context: RouteContext) {
  const sessionId = readSessionId(request);

  if (!sessionId) {
    return jsonNoStore({ message: "UNAUTHENTICATED" }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    const result = await queryOrdersForSession({
      sessionId,
      orderId: id,
      store: sessionStore,
      graphqlEndpoint: webEnv.graphqlEndpoint,
      fetchImpl: fetch,
      createInternalToken: createInternalSessionToken
    });

    return jsonNoStore({ order: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    const status = message === "UNAUTHENTICATED" ? 401 : 500;

    return jsonNoStore({ message }, { status });
  }
}
