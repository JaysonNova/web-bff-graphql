import { serve } from "@hono/node-server";
import { Hono } from "hono";

import { DEMO_ORDERS, SERVICE_PORTS } from "@demo/contracts";

const app = new Hono();

app.get("/health", (c) => c.json({ ok: true, service: "orders" }));

app.get("/orders", (c) => {
  const userId = c.req.query("userId");

  if (!userId) {
    return c.json({ message: "userId is required" }, 400);
  }

  return c.json(DEMO_ORDERS.filter((order) => order.userId === userId));
});

app.get("/orders/:id", (c) => {
  const order = DEMO_ORDERS.find((entry) => entry.id === c.req.param("id"));

  if (!order) {
    return c.json({ message: "order not found" }, 404);
  }

  return c.json(order);
});

const port = Number(process.env.PORT ?? SERVICE_PORTS.orders);

serve(
  {
    fetch: app.fetch,
    port
  },
  (info) => {
    console.log(`orders service listening on http://localhost:${info.port}`);
  }
);
