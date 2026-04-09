FROM node:22-bookworm-slim

RUN corepack enable

WORKDIR /app

COPY . .

RUN pnpm install --frozen-lockfile

CMD ["pnpm", "dev"]
