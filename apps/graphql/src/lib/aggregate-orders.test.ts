import { describe, expect, it } from "vitest";

import type { DemoInventory, DemoOrder, DemoProduct, DemoUser, ServiceTrace } from "@demo/contracts";

import { aggregateOrderDetail, aggregateOrderSummaries } from "./aggregate-orders";

const user: DemoUser = {
  id: "user-1",
  name: "Morgan Lee",
  email: "buyer@example.com",
  role: "buyer"
};

const order: DemoOrder = {
  id: "order-1002",
  userId: user.id,
  status: "processing",
  createdAt: "2026-04-09T07:15:00.000Z",
  items: [
    {
      productId: "prod-2",
      quantity: 2,
      unitPrice: 89
    }
  ]
};

const product: DemoProduct = {
  id: "prod-2",
  name: "Travel Messenger Bag",
  category: "bags"
};

const inventory: DemoInventory = {
  productId: "prod-2",
  inStock: 12,
  warehouse: "hangzhou-a"
};

function createTrace() {
  const downstream: ServiceTrace[] = [];

  return {
    downstream,
    push(entry: ServiceTrace) {
      downstream.push(entry);
    }
  };
}

describe("aggregateOrderSummaries", () => {
  it("returns totals and customer names for orders", async () => {
    const trace = createTrace();
    const result = await aggregateOrderSummaries([order], {
      loadUser: async () => user,
      trace
    });

    expect(result).toEqual([
      {
        id: "order-1002",
        status: "processing",
        createdAt: "2026-04-09T07:15:00.000Z",
        customerName: "Morgan Lee",
        itemCount: 2,
        total: 178
      }
    ]);
    expect(trace.downstream).toHaveLength(1);
    expect(trace.downstream[0]?.service).toBe("users");
  });
});

describe("aggregateOrderDetail", () => {
  it("keeps the order detail when inventory lookup fails", async () => {
    const trace = createTrace();
    const result = await aggregateOrderDetail(order, {
      loadUser: async () => user,
      loadProduct: async () => product,
      loadInventory: async () => {
        throw new Error("inventory unavailable");
      },
      trace
    });

    expect(result).toEqual({
      id: "order-1002",
      status: "processing",
      createdAt: "2026-04-09T07:15:00.000Z",
      customer: {
        id: "user-1",
        name: "Morgan Lee",
        email: "buyer@example.com",
        role: "buyer"
      },
      items: [
        {
          productId: "prod-2",
          productName: "Travel Messenger Bag",
          category: "bags",
          quantity: 2,
          unitPrice: 89,
          inventory: null
        }
      ],
      total: 178
    });
    expect(trace.downstream).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          service: "catalog",
          status: "error"
        })
      ])
    );
  });

  it("attaches inventory when all downstream calls succeed", async () => {
    const trace = createTrace();
    const result = await aggregateOrderDetail(order, {
      loadUser: async () => user,
      loadProduct: async () => product,
      loadInventory: async () => inventory,
      trace
    });

    expect(result?.items[0]?.inventory).toEqual(inventory);
    expect(trace.downstream).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          service: "catalog",
          status: "ok"
        })
      ])
    );
  });
});
