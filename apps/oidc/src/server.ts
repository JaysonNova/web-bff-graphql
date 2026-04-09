import { serve } from "@hono/node-server";
import { Hono } from "hono";

import { SERVICE_PORTS } from "@demo/contracts";

import { createProviderCore } from "./lib/provider-core";

const issuer = process.env.OIDC_ISSUER ?? `http://localhost:${SERVICE_PORTS.oidc}`;
const clientId = process.env.OIDC_CLIENT_ID ?? "web-bff";
const clientSecret = process.env.OIDC_CLIENT_SECRET ?? "super-secret";
const jwtSecret = process.env.OIDC_JWT_SECRET ?? "jwt-secret";

const provider = createProviderCore({
  issuer,
  clientId,
  clientSecret,
  jwtSecret
});

const app = new Hono();

app.get("/health", (c) => c.json({ ok: true, service: "oidc" }));

app.get("/.well-known/openid-configuration", (c) =>
  c.json({
    issuer,
    authorization_endpoint: `${issuer}/authorize`,
    token_endpoint: `${issuer}/token`,
    userinfo_endpoint: `${issuer}/userinfo`
  })
);

app.get("/authorize", (c) => {
  const redirect = provider.authorize({
    clientId: c.req.query("client_id") ?? "",
    redirectUri: c.req.query("redirect_uri") ?? "",
    state: c.req.query("state") ?? "",
    nonce: c.req.query("nonce") ?? ""
  });

  return c.redirect(redirect);
});

app.post("/token", async (c) => {
  const formData = await c.req.formData();
  const tokenResponse = await provider.exchange({
    code: String(formData.get("code") ?? ""),
    clientId: String(formData.get("client_id") ?? ""),
    clientSecret: String(formData.get("client_secret") ?? ""),
    redirectUri: String(formData.get("redirect_uri") ?? "")
  });

  return c.json(tokenResponse);
});

app.get("/userinfo", (c) => {
  const authHeader = c.req.header("authorization") ?? "";
  const accessToken = authHeader.replace(/^Bearer\s+/i, "");

  return c.json(provider.getUserInfo(accessToken));
});

const port = Number(process.env.PORT ?? SERVICE_PORTS.oidc);

serve(
  {
    fetch: app.fetch,
    port
  },
  (info) => {
    console.log(`oidc provider listening on http://localhost:${info.port}`);
  }
);
