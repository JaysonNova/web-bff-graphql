import { jsonNoStore } from "@/src/lib/response";
import { createInternalSessionToken } from "@/src/lib/internal-session-token";
import { webEnv } from "@/src/lib/env";
import { queryOrdersForSession } from "@/src/lib/orders-client";
import { readSessionId } from "@/src/lib/session-cookie";
import { sessionStore } from "@/src/lib/stores";

export async function GET(request: import("next/server").NextRequest) {
  const sessionId = readSessionId(request);

  if (!sessionId) {
    return jsonNoStore({ message: "UNAUTHENTICATED" }, { status: 401 });
  }

  try {
    const result = await queryOrdersForSession({
      sessionId,
      store: sessionStore,
      graphqlEndpoint: webEnv.graphqlEndpoint,
      fetchImpl: fetch,
      createInternalToken: createInternalSessionToken
    });

    return jsonNoStore(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    const status = message === "UNAUTHENTICATED" ? 401 : 500;

    return jsonNoStore({ message }, { status });
  }
}
