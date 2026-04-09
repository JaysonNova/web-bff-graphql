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
- Downstream partial failure is exposed in trace data instead of crashing the whole UI

## Main user flow

1. Open `http://localhost:3000/login`
2. Submit the login form
3. Web BFF creates auth request state and redirects to local OIDC
4. OIDC redirects back to `/api/auth/callback`
5. Web BFF exchanges the code, creates a server-side session, and sets `bff_session`
6. `/orders` calls `/api/orders/query`
7. Web BFF forwards the request to GraphQL with `x-demo-user-id`
8. GraphQL aggregates `orders`, `users`, and `catalog`
9. `/trace` shows the latest orchestration trace stored by the Web BFF

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
  Thin BFF endpoints: login, callback, logout, session, orders proxy, trace.
- `apps/web/src/lib/stores.ts`
  File-backed runtime store for auth requests, sessions, and trace snapshots.
- `apps/graphql/src/server.ts`
  GraphQL schema and downstream service wiring.
- `apps/graphql/src/lib/aggregate-orders.ts`
  Aggregation logic and graceful handling of inventory failures.
- `apps/oidc/src/lib/provider-core.ts`
  Minimal local OIDC behavior: authorize, token exchange, ID token verification.
- `services/*/src/server.ts`
  Mock REST backends.

## Key interfaces

### Web BFF

- `POST /api/auth/login`
- `GET /api/auth/callback`
- `POST /api/auth/logout`
- `GET /api/session`
- `POST /api/orders/query`
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

- `pnpm test`: pass, `10/10`
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

## Demo-specific behavior

- `services/catalog/src/server.ts` intentionally returns `503` for `/inventory/prod-2`
- `/orders/[id]` still renders order detail when that happens
- `/trace` should show the failed downstream call in `lastTrace.downstream`

## Runtime storage

The Web BFF uses a file-backed store so session/auth state survives route recompiles in `next dev`.

- Store file: `os.tmpdir()/web-bff-graphql-demo-state.json`
- On macOS this will usually land under `/var/folders/.../T/web-bff-graphql-demo-state.json`

If you want a clean login/session reset, delete that file and clear the browser cookie or your curl cookie jar.

## Docker Compose note

`docker-compose.yml` is included as the container topology starter and `docker compose config` has been validated. The fully verified end-to-end browser flow in this pass is `pnpm dev`.

If you want Compose to be the primary demo path, the next improvement should be splitting:

- public OIDC origin used in browser redirects
- internal OIDC origin used by server-side token exchange

That avoids using the same issuer base URL for both host and container networking.

## Suggested first changes

If another engineer picks this up, the safest next increments are:

1. Add Playwright smoke coverage for login, orders, detail, and trace
2. Split public/internal OIDC configuration for full Compose E2E verification
3. Replace the file-backed store with Redis or SQLite if multi-process persistence matters
4. Add one more downstream service or mutation flow if the demo needs broader coverage
