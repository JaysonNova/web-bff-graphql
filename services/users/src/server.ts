import { serve } from "@hono/node-server";
import { Hono } from "hono";

import { DEMO_USERS, SERVICE_PORTS } from "@demo/contracts";

const app = new Hono();

app.get("/health", (c) => c.json({ ok: true, service: "users" }));

app.get("/users/:id", (c) => {
  const user = DEMO_USERS[c.req.param("id")];

  if (!user) {
    return c.json({ message: "user not found" }, 404);
  }

  return c.json(user);
});

const port = Number(process.env.PORT ?? SERVICE_PORTS.users);

serve(
  {
    fetch: app.fetch,
    port
  },
  (info) => {
    console.log(`users service listening on http://localhost:${info.port}`);
  }
);
