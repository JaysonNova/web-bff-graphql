# Web BFF + GraphQL Demo

Start with [docs/handoff.md](/Users/fangtao/Documents/Codebase/web-bff-graphql/docs/handoff.md) if you are taking this repo over.

This repository demonstrates a Web-focused architecture with:

- `apps/web`: `Next.js` UI plus a thin Web BFF
- `apps/graphql`: independent GraphQL orchestration layer
- `apps/oidc`: local OIDC provider for login and callback flow
- `services/users`, `services/orders`, `services/catalog`: mock downstream services
- `packages/contracts`: shared fixtures and TypeScript contracts

The browser only talks to `apps/web`. The BFF owns login, callback, session cookies, CSRF checks, and trace snapshots. Domain aggregation stays in GraphQL, and GraphQL now accepts only BFF-issued internal JWTs.

## Demo flow

1. Open `http://localhost:3000/login`
2. Click the login button
3. Land on `/orders`
4. Open an order detail page
5. Open `/trace`

`prod-2` intentionally returns a `503` inventory response so the detail page can show partial degradation while the trace page shows the downstream failure.

## Local development

```bash
pnpm install
pnpm test
pnpm typecheck
pnpm build
pnpm dev
```

For production-near local behavior, run Redis and point the web app at it:

```bash
REDIS_URL=redis://localhost:6379 pnpm dev
```

Services start on these ports:

- `web`: `3000`
- `graphql`: `4000`
- `oidc`: `4001`
- `users`: `4101`
- `orders`: `4102`
- `catalog`: `4103`
- `redis`: `6379`

## Docker Compose

```bash
docker compose up --build
```

The web app stays on `http://localhost:3000`.

## Key API boundaries

- Web BFF
  - `POST /api/auth/login`
  - `GET /api/auth/callback`
  - `POST /api/auth/logout`
  - `GET /api/session`
  - `GET /api/orders`
  - `GET /api/orders/:id`
  - `GET /api/trace`
- GraphQL
  - `Query.viewer`
  - `Query.orders`
  - `Query.order(id)`
