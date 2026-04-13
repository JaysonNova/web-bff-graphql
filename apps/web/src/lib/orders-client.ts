import type { OrderDetail, OrderSummary, ServiceTrace, TraceSnapshot } from "@demo/contracts";

import type { SessionRecord } from "./session-store";

type SessionStore = {
  get(sessionId: string): Promise<SessionRecord | null>;
  updateTrace(sessionId: string, trace: TraceSnapshot): Promise<SessionRecord | null>;
};

type QueryOrdersInput = {
  sessionId: string;
  orderId?: string;
  store: SessionStore;
  graphqlEndpoint: string;
  fetchImpl: typeof fetch;
  createInternalToken(session: SessionRecord): Promise<string>;
};

type GraphqlResponse<T> = {
  data?: T;
  errors?: Array<{ message: string }>;
  extensions?: {
    trace?: ServiceTrace[];
  };
};

type OrdersListData = {
  orders: OrderSummary[];
};

type OrderDetailData = {
  order: OrderDetail | null;
};

function buildListQuery() {
  return {
    operationName: "OrdersList",
    query: `
      query OrdersList {
        orders {
          id
          status
          createdAt
          customerName
          itemCount
          total
        }
      }
    `
  };
}

function buildDetailQuery(orderId: string) {
  return {
    operationName: "OrderDetail",
    query: `
      query OrderDetail($orderId: ID!) {
        order(id: $orderId) {
          id
          status
          createdAt
          total
          customer {
            id
            name
            email
            role
          }
          items {
            productId
            productName
            category
            quantity
            unitPrice
            inventory {
              productId
              inStock
              warehouse
            }
          }
        }
      }
    `,
    variables: {
      orderId
    }
  };
}

export async function queryOrdersForSession(input: QueryOrdersInput) {
  const session = await input.store.get(input.sessionId);

  if (!session) {
    throw new Error("UNAUTHENTICATED");
  }

  const payload = input.orderId ? buildDetailQuery(input.orderId) : buildListQuery();
  const internalToken = await input.createInternalToken(session);
  const response = await input.fetchImpl(input.graphqlEndpoint, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${internalToken}`
    },
    body: JSON.stringify(payload)
  });

  const json = (await response.json()) as GraphqlResponse<OrdersListData | OrderDetailData>;

  if (!response.ok || json.errors?.length) {
    throw new Error(json.errors?.[0]?.message ?? "GRAPHQL_REQUEST_FAILED");
  }

  const trace: TraceSnapshot = {
    operationName: payload.operationName,
    generatedAt: new Date().toISOString(),
    downstream: json.extensions?.trace ?? [],
    resultSummary: input.orderId
      ? `detail ${input.orderId}`
      : `${(json.data as OrdersListData).orders.length} orders`
  };

  await input.store.updateTrace(input.sessionId, trace);

  if (input.orderId) {
    return (json.data as OrderDetailData).order;
  }

  return json.data as OrdersListData;
}
