import { buildSubgraphSchema, printSubgraphSchema } from "@apollo/subgraph";
import type { GraphQLSchema } from "graphql";

import { ordersModule } from "./modules/orders.js";
import { viewerModule } from "./modules/viewer.js";

export function buildGraphqlSchema(): GraphQLSchema {
  return buildSubgraphSchema([viewerModule, ordersModule]);
}

export function printGraphqlSchema() {
  return printSubgraphSchema(buildGraphqlSchema());
}
