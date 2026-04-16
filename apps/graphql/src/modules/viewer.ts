import { parse } from "graphql";

import { toViewer, type DemoUser } from "@demo/contracts";

import type { GraphqlContext } from "../context.js";

import { createGraphqlError, toGraphqlError } from "../errors.js";
import { fetchJson } from "../lib/downstream.js";

export const viewerModule = {
  typeDefs: parse(/* GraphQL */ `
    extend schema
      @link(url: "https://specs.apollo.dev/federation/v2.3")

    type Query {
      viewer: Viewer!
    }

    type Viewer {
      id: ID!
      name: String!
      email: String!
      role: String!
    }
  `),
  resolvers: {
    Query: {
      async viewer(_: unknown, __: unknown, context: GraphqlContext) {
        if (!context.auth?.userId) {
          throw createGraphqlError("UNAUTHENTICATED");
        }

        try {
          const user = await fetchJson<DemoUser>({
            service: "users",
            baseUrl: context.services.usersUrl,
            path: `/users/${context.auth.userId}`,
            trace: context.trace.downstream,
            fetchImpl: context.fetchImpl
          });

          return toViewer(user);
        } catch (error) {
          throw toGraphqlError(error);
        }
      }
    }
  }
};
