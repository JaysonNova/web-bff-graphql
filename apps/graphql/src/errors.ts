import type { GraphqlErrorCode } from "@demo/contracts";
import { GraphQLError, type GraphQLFormattedError } from "graphql";

export class DownstreamServiceError extends Error {
  constructor(
    readonly code: GraphqlErrorCode,
    readonly service: string,
    readonly path: string,
    readonly status: number,
    detail: string
  ) {
    super(detail || `${service} request failed: ${status}`);
    this.name = "DownstreamServiceError";
  }
}

export function createGraphqlError(code: GraphqlErrorCode) {
  return new GraphQLError(code, {
    extensions: {
      code
    }
  });
}

export function toGraphqlError(error: unknown) {
  if (error instanceof GraphQLError) {
    return error;
  }

  if (error instanceof DownstreamServiceError) {
    return new GraphQLError(error.code, {
      extensions: {
        code: error.code,
        service: error.service,
        path: error.path,
        httpStatus: error.status
      }
    });
  }

  return createGraphqlError("INTERNAL_SERVER_ERROR");
}

export function formatGraphqlError(error: GraphQLFormattedError) {
  const code =
    typeof error.extensions?.code === "string" ? error.extensions.code : "INTERNAL_SERVER_ERROR";

  return {
    ...error,
    message: code,
    extensions: {
      ...error.extensions,
      code
    }
  };
}
