import { toViewer, type DemoInventory, type DemoOrder, type DemoProduct, type DemoUser, type OrderDetail, type OrderSummary, type ServiceTrace } from "@demo/contracts";

export type TraceRecorder = {
  downstream: ServiceTrace[];
  push(entry: ServiceTrace): void;
};

type AggregateOrderOptions = {
  loadUser(userId: string): Promise<DemoUser>;
  loadProduct(productId: string): Promise<DemoProduct>;
  loadInventory(productId: string): Promise<DemoInventory>;
  trace: TraceRecorder;
};

type AggregateSummaryOptions = {
  loadUser(userId: string): Promise<DemoUser>;
  trace: TraceRecorder;
};

function totalForOrder(order: DemoOrder): number {
  return order.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
}

function recordTrace(trace: TraceRecorder, entry: Omit<ServiceTrace, "durationMs">) {
  trace.push({
    ...entry,
    durationMs: 0
  });
}

export async function aggregateOrderSummaries(
  orders: DemoOrder[],
  options: AggregateSummaryOptions
): Promise<OrderSummary[]> {
  return Promise.all(
    orders.map(async (order) => {
      const user = await options.loadUser(order.userId);

      recordTrace(options.trace, {
        service: "users",
        path: `/users/${order.userId}`,
        status: "ok"
      });

      return {
        id: order.id,
        status: order.status,
        createdAt: order.createdAt,
        customerName: user.name,
        itemCount: order.items.reduce((sum, item) => sum + item.quantity, 0),
        total: totalForOrder(order)
      };
    })
  );
}

export async function aggregateOrderDetail(
  order: DemoOrder,
  options: AggregateOrderOptions
): Promise<OrderDetail> {
  const user = await options.loadUser(order.userId);

  recordTrace(options.trace, {
    service: "users",
    path: `/users/${order.userId}`,
    status: "ok"
  });

  const items = await Promise.all(
    order.items.map(async (item) => {
      const product = await options.loadProduct(item.productId);

      recordTrace(options.trace, {
        service: "catalog",
        path: `/products/${item.productId}`,
        status: "ok"
      });

      let inventory: DemoInventory | null = null;

      try {
        inventory = await options.loadInventory(item.productId);
        recordTrace(options.trace, {
          service: "catalog",
          path: `/inventory/${item.productId}`,
          status: "ok"
        });
      } catch (error) {
        recordTrace(options.trace, {
          service: "catalog",
          path: `/inventory/${item.productId}`,
          status: "error",
          detail: error instanceof Error ? error.message : "unknown inventory error"
        });
      }

      return {
        productId: item.productId,
        productName: product.name,
        category: product.category,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        inventory
      };
    })
  );

  return {
    id: order.id,
    status: order.status,
    createdAt: order.createdAt,
    customer: toViewer(user),
    items,
    total: totalForOrder(order)
  };
}
