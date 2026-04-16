import { parse } from "graphql";

import type { DemoInventory, DemoOrder, DemoProduct, DemoUser } from "@demo/contracts";

import type { GraphqlContext } from "../context.js";

import { aggregateOrderDetail, aggregateOrderSummaries } from "../lib/aggregate-orders.js";
import { fetchJson } from "../lib/downstream.js";
import { createGraphqlError, toGraphqlError } from "../errors.js";

export const ordersModule = {
  typeDefs: parse(/* GraphQL */ `
    extend type Query {
      orders: [OrderSummary!]!
      order(id: ID!): OrderDetail
    }

    type Inventory {
      productId: ID!
      inStock: Int!
      warehouse: String!
    }

    type OrderItem {
      productId: ID!
      productName: String!
      category: String!
      quantity: Int!
      unitPrice: Int!
      inventory: Inventory
    }

    type OrderSummary {
      id: ID!
      status: String!
      createdAt: String!
      customerName: String!
      itemCount: Int!
      total: Int!
    }

    type OrderDetail {
      id: ID!
      status: String!
      createdAt: String!
      customer: Viewer!
      items: [OrderItem!]!
      total: Int!
    }
  `),
  resolvers: {
    Query: {
      async orders(_: unknown, __: unknown, context: GraphqlContext) {
        if (!context.auth?.userId) {
          throw createGraphqlError("UNAUTHENTICATED");
        }

        try {
          const orders = await fetchJson<DemoOrder[]>({
            service: "orders",
            baseUrl: context.services.ordersUrl,
            path: `/orders?userId=${context.auth.userId}`,
            trace: context.trace.downstream,
            fetchImpl: context.fetchImpl
          });

          return aggregateOrderSummaries(orders, {
            trace: {
              downstream: context.trace.downstream,
              push(entry) {
                context.trace.downstream.push(entry);
              }
            },
            loadUser(userId) {
              return fetchJson<DemoUser>({
                service: "users",
                baseUrl: context.services.usersUrl,
                path: `/users/${userId}`,
                trace: [],
                fetchImpl: context.fetchImpl
              });
            }
          });
        } catch (error) {
          throw toGraphqlError(error);
        }
      },

      async order(_: unknown, args: { id: string }, context: GraphqlContext) {
        if (!context.auth?.userId) {
          throw createGraphqlError("UNAUTHENTICATED");
        }

        try {
          const order = await fetchJson<DemoOrder>({
            service: "orders",
            baseUrl: context.services.ordersUrl,
            path: `/orders/${args.id}`,
            trace: context.trace.downstream,
            fetchImpl: context.fetchImpl
          });

          if (order.userId !== context.auth.userId) {
            throw createGraphqlError("FORBIDDEN");
          }

          return aggregateOrderDetail(order, {
            trace: {
              downstream: context.trace.downstream,
              push(entry) {
                context.trace.downstream.push(entry);
              }
            },
            loadUser(userId) {
              return fetchJson<DemoUser>({
                service: "users",
                baseUrl: context.services.usersUrl,
                path: `/users/${userId}`,
                trace: [],
                fetchImpl: context.fetchImpl
              });
            },
            loadProduct(productId) {
              return fetchJson<DemoProduct>({
                service: "catalog",
                baseUrl: context.services.catalogUrl,
                path: `/products/${productId}`,
                trace: [],
                fetchImpl: context.fetchImpl
              });
            },
            loadInventory(productId) {
              return fetchJson<DemoInventory>({
                service: "catalog",
                baseUrl: context.services.catalogUrl,
                path: `/inventory/${productId}`,
                trace: [],
                fetchImpl: context.fetchImpl
              });
            }
          });
        } catch (error) {
          throw toGraphqlError(error);
        }
      }
    }
  }
};
