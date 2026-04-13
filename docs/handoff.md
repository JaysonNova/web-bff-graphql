# Web BFF + GraphQL Demo Handoff

## What this repo demonstrates

This repo is a small but complete Web architecture demo:

- `apps/web`: `Next.js` app plus thin Web BFF
- `apps/graphql`: independent GraphQL orchestration layer
- `apps/oidc`: local OIDC provider for login and callback flow
- `services/users`, `services/orders`, `services/catalog`: mock downstream REST services
- `packages/contracts`: shared demo fixtures and TypeScript contracts

The intended lesson is:

- Browser traffic stays on the Web BFF
- Login/session/token handling stays in the Web tier
- Business aggregation stays in a separate GraphQL layer
- GraphQL trusts only short-lived BFF-issued internal JWTs
- Downstream partial failure is exposed in trace data instead of crashing the whole UI

## Main user flow

1. Open `http://localhost:3000/login`
2. Submit the login form
3. Web BFF creates auth request state plus PKCE verifier and redirects to local OIDC
4. OIDC redirects back to `/api/auth/callback`
5. Web BFF exchanges the code with the internal OIDC origin, validates `state` and `nonce`, creates a server-side session, and sets a session cookie
6. `/orders` calls `GET /api/orders`
7. Web BFF forwards the request to GraphQL with a short-lived internal JWT
8. GraphQL validates the internal JWT and aggregates `orders`, `users`, and `catalog`
9. `/trace` shows the latest orchestration trace stored by the Web BFF when `ENABLE_TRACE_UI=true`

## Directory guide

- `apps/web/app/login/page.tsx`
  Login page and architecture framing.
- `apps/web/app/orders/page.tsx`
  Orders list driven only by BFF endpoints.
- `apps/web/app/orders/[id]/page.tsx`
  Order detail page that demonstrates partial degradation.
- `apps/web/app/trace/page.tsx`
  Debug/teaching page for session state and downstream trace.
- `apps/web/app/api/*`
  Thin BFF endpoints: login, callback, logout, session, orders resources, trace.
- `apps/web/src/lib/stores.ts`
  Runtime auth/session store with Redis support and in-memory fallback.
- `apps/graphql/src/server.ts`
  GraphQL schema, internal JWT validation, and downstream service wiring.
- `apps/graphql/src/lib/aggregate-orders.ts`
  Aggregation logic and graceful handling of inventory failures.
- `apps/oidc/src/lib/provider-core.ts`
  Minimal local OIDC behavior with exact redirect URI checks and PKCE validation.
- `services/*/src/server.ts`
  Mock REST backends.

## Key interfaces

### Web BFF

- `POST /api/auth/login`
- `GET /api/auth/callback`
- `POST /api/auth/logout`
- `GET /api/session`
- `GET /api/orders`
- `GET /api/orders/[id]`
- `GET /api/trace`

### GraphQL

- `Query.viewer`
- `Query.orders`
- `Query.order(id)`

## Local development

### Install

```bash
pnpm install
```

### Verify

```bash
pnpm test
pnpm typecheck
pnpm build
```

Last verified in this handoff:

- `pnpm test`: pass, `27/27`
- `pnpm typecheck`: pass
- `pnpm build`: pass
- `docker compose config`: pass

### Run

```bash
pnpm dev
```

Ports:

- `web`: `3000`
- `graphql`: `4000`
- `oidc`: `4001`
- `users`: `4101`
- `orders`: `4102`
- `catalog`: `4103`
- `redis`: `6379`

## Demo-specific behavior

- `services/catalog/src/server.ts` intentionally returns `503` for `/inventory/prod-2`
- `/orders/[id]` still renders order detail when that happens
- `/trace` should show the failed downstream call in `lastTrace.downstream`

## Runtime storage

The Web BFF supports Redis-backed auth/session state and falls back to in-memory state when `REDIS_URL` is unset.

- Recommended production-near setting: `REDIS_URL=redis://localhost:6379`
- Docker Compose enables Redis by default
- Session timeouts: `30m` idle, `8h` absolute

If you want a clean local login/session reset in memory mode, restart the web process and clear the browser cookie or curl cookie jar.

## Docker Compose note

`docker-compose.yml` is included as the production-near demo topology. It now includes:

- Redis for shared auth/session state
- public OIDC origin used in browser redirects
- internal OIDC origin used by server-side token exchange
- shared internal JWT settings between Web BFF and GraphQL

## Suggested first changes

If another engineer picks this up, the safest next increments are:

1. Add Playwright smoke coverage for login, orders, detail, and trace
2. Add route-level integration tests for auth callback, logout CSRF protection, and trace feature gating
3. Verify full Docker Compose browser flow end-to-end with Playwright
4. Add one more downstream service or mutation flow if the demo needs broader coverage
