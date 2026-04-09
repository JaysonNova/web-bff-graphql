# Repository Guidelines

## Project Structure & Module Organization
This pnpm workspace is split by runtime role. `apps/web` contains the Next.js UI and thin Web BFF routes under `app/api/*`. `apps/graphql` owns cross-service aggregation. `apps/oidc` is the local identity provider. `services/users`, `services/orders`, and `services/catalog` are mock downstream APIs. `packages/contracts` holds shared TypeScript contracts and fixtures. Start with `docs/handoff.md` for architecture context and demo flow details.

## Build, Test, and Development Commands
Use the workspace root for all commands. `pnpm install` installs dependencies. `pnpm dev` starts all apps and services in parallel; the main entry point is `http://localhost:3000`. `pnpm test` runs Vitest once across workspace packages. `pnpm test:watch` is the local watch mode. `pnpm typecheck` runs `tsc --noEmit` in each package. `pnpm build` builds `@demo/web` and is the quickest integration check before opening a PR.

## Coding Style & Naming Conventions
This repo uses strict TypeScript with ES modules. Follow the existing style: 2-space indentation, double quotes, semicolons, and small typed helpers over inline ad hoc objects. Use `PascalCase` for React components and exported types, `camelCase` for functions/variables, and kebab-style route segments like `app/api/orders/query`. Keep tests next to the code they cover as `*.test.ts`.

## Testing Guidelines
Vitest is configured in the root `vitest.config.ts` and picks up `apps/**/src/**/*.test.ts`, `services/**/src/**/*.test.ts`, and `packages/**/src/**/*.test.ts`. Add or update tests whenever behavior changes in BFF session handling, GraphQL aggregation, OIDC flow, or shared contracts. Favor focused unit tests with stable fixtures from `packages/contracts`. Run `pnpm test && pnpm typecheck` before submitting changes.

## Commit & Pull Request Guidelines
There is no established commit history yet, so use short imperative subjects with a clear scope, for example `apps/web: harden trace route` or `graphql: cover catalog fallback`. Keep unrelated changes out of the same commit. PRs should include a brief summary, affected packages, verification steps, and screenshots for UI changes in `apps/web`.

## Architecture & Configuration Notes
Preserve the demo boundary: the browser should call only `apps/web`; auth, cookies, and session state stay in the BFF; service aggregation stays in GraphQL. Do not commit local runtime state, coverage output, or `.next` artifacts.
