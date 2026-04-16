import type { TraceStatus } from "@demo/contracts";
import type { ApolloServerPlugin } from "@apollo/server";

import type { GraphqlContext } from "../context.js";

function summarizeResult(
  operationName: string,
  data: Record<string, unknown> | null | undefined,
  hasErrors: boolean
) {
  if (hasErrors) {
    return "request failed";
  }

  const orders = data?.orders;

  if (Array.isArray(orders)) {
    return `${orders.length} orders`;
  }

  const order = data?.order as { id?: string } | null | undefined;

  if (order?.id) {
    return `detail ${order.id}`;
  }

  const viewer = data?.viewer as { id?: string } | null | undefined;

  if (viewer?.id) {
    return `viewer ${viewer.id}`;
  }

  return operationName;
}

function resolveStatus(hasErrors: boolean, hasPartialFailures: boolean): TraceStatus {
  if (hasErrors) {
    return "error";
  }

  return hasPartialFailures ? "partial" : "ok";
}

export function createBffTracePlugin(): ApolloServerPlugin<GraphqlContext> {
  return {
    async requestDidStart() {
      return {
        async willSendResponse(requestContext) {
          if (requestContext.response.body.kind !== "single") {
            return;
          }

          const singleResult = requestContext.response.body.singleResult;
          const hasErrors = Boolean(singleResult.errors?.length);
          const hasPartialFailures = requestContext.contextValue.trace.downstream.some(
            (entry) => entry.status === "error"
          );

          requestContext.response.body.singleResult.extensions = {
            ...(singleResult.extensions ?? {}),
            bffTrace: {
              ...requestContext.contextValue.trace,
              status: resolveStatus(hasErrors, hasPartialFailures),
              resultSummary:
                requestContext.contextValue.trace.resultSummary ||
                summarizeResult(
                  requestContext.contextValue.trace.operationName,
                  (singleResult.data as Record<string, unknown> | undefined) ?? undefined,
                  hasErrors
                )
            }
          };
        }
      };
    }
  };
}
