import { serve } from "@hono/node-server";
import { Hono } from "hono";

import { DEMO_INVENTORY, DEMO_PRODUCTS, SERVICE_PORTS } from "@demo/contracts";

const app = new Hono();

app.get("/health", (c) => c.json({ ok: true, service: "catalog" }));

app.get("/products/:id", (c) => {
  const product = DEMO_PRODUCTS[c.req.param("id")];

  if (!product) {
    return c.json({ message: "product not found" }, 404);
  }

  return c.json(product);
});

app.get("/inventory/:productId", (c) => {
  const productId = c.req.param("productId");

  if (productId === "prod-2") {
    return c.json(
      {
        message: "inventory lookup is temporarily unavailable for prod-2"
      },
      503
    );
  }

  const inventory = DEMO_INVENTORY[productId];

  if (!inventory) {
    return c.json({ message: "inventory not found" }, 404);
  }

  return c.json(inventory);
});

const port = Number(process.env.PORT ?? SERVICE_PORTS.catalog);

serve(
  {
    fetch: app.fetch,
    port
  },
  (info) => {
    console.log(`catalog service listening on http://localhost:${info.port}`);
  }
);
