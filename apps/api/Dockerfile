# ── Stage 1: Install dependencies ────────────────────────────────────
FROM node:24-alpine AS deps

RUN apk add --no-cache python3 make g++

RUN corepack enable && corepack prepare pnpm@10.29.3 --activate

WORKDIR /repo

# Copy only lockfile + manifests to maximise layer cache
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json .npmrc ./
COPY apps/api/package.json              apps/api/package.json
COPY packages/shared/package.json       packages/shared/package.json
COPY packages/db-backend/package.json   packages/db-backend/package.json
COPY packages/config/package.json       packages/config/package.json

RUN pnpm install --frozen-lockfile

# ── Stage 2: Build ───────────────────────────────────────────────────
FROM deps AS build

# Copy source needed by turbo build (shared → db-backend → api)
COPY turbo.json turbo.json
COPY apps/api/         apps/api/
COPY packages/shared/  packages/shared/
COPY packages/db-backend/ packages/db-backend/
COPY packages/config/  packages/config/

RUN pnpm turbo build --filter=@repo/api

# Extract production-only node_modules for @repo/api
RUN pnpm deploy --filter=@repo/api --prod --legacy /app/deployed

# ── Stage 3: Production ─────────────────────────────────────────────
FROM node:24-alpine AS production

RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

COPY --from=build /app/deployed/node_modules ./node_modules
COPY --from=build /repo/apps/api/dist/main.js ./dist/main.js
# Worker entrypoint: `docker run <image> node dist/worker.js`
COPY --from=build /repo/apps/api/dist/worker.js ./dist/worker.js
# Standalone migration runner: `docker run <image> node dist/migrate.js`
COPY --from=build /repo/apps/api/dist/migrate.js ./dist/migrate.js
# Migrations applied automatically by bootstrap() on startup (see ADR-002)
COPY --from=build /repo/packages/db-backend/src/migrations ./migrations

# Tell bootstrap() where to find migrations (matches the COPY target above).
ENV MIGRATIONS_DIR=/app/migrations

USER appuser

EXPOSE 3000

CMD ["node", "dist/main.js"]
