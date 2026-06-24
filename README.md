# Product Template

A production-grade monorepo template for AI-first products. It ships the full engineering setup — backend, frontend, shared packages, local dev orchestration, CI/CD, and GitOps deployment — with **no product domain logic**. Start here, replace the `example` domain, and ship.

## Overview

- **Backend:** NestJS 11 + Drizzle ORM (PostgreSQL) + BullMQ (Redis) + Swagger + Bull Board, JWT auth (Supabase JWKS), health/metrics, structured logging.
- **Frontend:** React 19 + Vite + TanStack Router + TanStack Query + Zustand + React Hook Form + Zod + Tailwind CSS + shadcn/ui.
- **Shared:** Zod contracts (`@repo/shared`), TanStack Query hooks + Zustand stores (`@repo/client-core`), Supabase Auth/Realtime/Storage wrappers (`@repo/services-client`), Drizzle schema + migrations (`@repo/db-backend`), shared tsconfig/vitest/biome (`@repo/config`).
- **Tooling:** Turborepo, Biome, Vitest, a worktree-safe local-env orchestrator, and a DDD "system board" visualizer.
- **Ops:** Docker, GitHub Actions, Helm + ArgoCD GitOps, optional Vercel for the web app, SOPS-friendly secrets.

An `example` domain (`example_entities`) demonstrates the end-to-end pattern: **Drizzle table → Zod contract → API module → client hook → web feature**.

## Architecture

```
Browser ── Supabase (Auth/Realtime/Storage) 
   │
   └── apps/web (React SPA) ──REST──> apps/api (NestJS) ──Drizzle──> PostgreSQL
                                          └── BullMQ ──> Redis
```

- All persistent data flows through the API (REST). The backend talks to Postgres via Drizzle only.
- Contracts live once in `@repo/shared` (Zod). The API validates against them; the client infers types from them (see `docs/adr/004-api-contract-via-shared.md`).
- Modular monolith, not microservices (`docs/adr/003`). Migrations run automatically on API startup (`docs/adr/002`).

## Monorepo Structure

```
apps/
  api/                 NestJS backend (modules/, auth, health, queue, common)
  web/                 React + Vite SPA (features/, app/routes, shared/)
packages/
  shared/              Zod schemas + inferred types + axios api-client
  client-core/         TanStack Query hooks + Zustand store factories
  services-client/     Supabase Auth/Realtime/Storage behind interfaces
  db-backend/          Drizzle schema + migrations
  config/              Shared tsconfig / vitest / biome bases
tools/
  local-env/           Worktree-safe local dev orchestrator (`pnpm local:dev`)
  system-board/        DDD documentation visualizer
deploy/                Helm chart for the API (GitOps + ArgoCD)
.github/workflows/     CI + GitOps deploy pipelines
.agents/ .claude/      Agent tooling (skills, hooks)
```

## Local Development

Requires Docker + Node 24 + pnpm.

```bash
pnpm install
pnpm local:dev      # Postgres + Redis (Docker) + migrations + seed + API + web
```

`local:dev` allocates free ports per worktree and writes state to `.local-env/`. It boots **without a real Supabase** using a local-dev auth bypass (a `Local Admin` profile is seeded directly). To use a real Supabase, export `LOCAL_DEV_SUPABASE_URL`, `LOCAL_DEV_SUPABASE_PUBLISHABLE_KEY`, and `LOCAL_DEV_SUPABASE_SERVICE_ROLE_KEY` before running.

Other entry points (all via the `Makefile` — run `make help`):

```bash
make local          # same as pnpm local:dev
make local-e2e      # API e2e against the prepared local env
make web            # web dev server only
make check          # format + typecheck + test + build (the full gate)
```

Copy the `.env.example` files to `.env` in each app/package and fill in real values for non-local deployments.

## Building

All builds go through Turborepo via the `Makefile`:

```bash
make build                 # build every package + app (respects the dep graph)
make build PKG=@repo/api    # build a single workspace
make check                 # full gate: format + typecheck + test + build
```

Per-target builds:

- **API image (Docker):** `docker build -f apps/api/Dockerfile -t api:local .`
- **Web app:** built by Vercel — automatically on push to `staging`, or locally with `npx vercel build --prod` (see [`docs/deployment.md`](docs/deployment.md)).
- **Demo runtime:** `make demo` compiles the API (`nest build`) and starts it with the worker behind the ngrok tunnel.

## Database Workflow

Schema lives in `packages/db-backend/src/schema/` (one file per table, re-exported from `index.ts`).

```bash
# 1. Edit/add a table in packages/db-backend/src/schema/
# 2. Generate a migration from the schema diff:
make db-generate
# 3. Review the SQL in packages/db-backend/src/migrations/
# 4. Apply it (local:dev applies migrations automatically):
make db-migrate
# Inspect data:
make db-studio
```

The API also runs pending migrations on startup (idempotent, advisory-locked). Use the `new-drizzle-table` → `db-migrate` skill chain.

## Testing

TDD is the default (Red → Green → Refactor). Tests live next to the code (`foo.ts` → `foo.test.ts`).

```bash
make test                 # all packages
make test PKG=@repo/api   # one package
make local-e2e            # API e2e against real local infra
```

Notable suites kept by the template:
- **NestJS DI compilation test** (`apps/api/src/app.module.test.ts`) — catches DI wiring errors.
- **Shared schema tests**, **client-core hook tests**, **web smoke tests**, and **example-domain tests**.

## Deployment

The live TrendScout demo does **not** run the API in a cluster. The API + report
worker run **locally on a GPU host** (they need a local Ollama for LLM inference)
and are exposed to the Vercel frontend through a **stable ngrok domain**. The web
app (Vite) is on Vercel and reaches the API via the project env var `VITE_API_URL`
— set once to the stable ngrok domain, so there's no redeploy churn.

```bash
make demo        # GPU host: Postgres + Redis + migrations + API + worker + ngrok
make demo-stop   # tear it down
```

Push to `staging` (or run the Vercel CLI manually) to deploy the web app. Full
guide — prerequisites, one-time setup, deploy paths, and troubleshooting — in
[`docs/deployment.md`](docs/deployment.md); pre-demo checklist in
[`docs/demo-runbook.md`](docs/demo-runbook.md).

The Helm chart + GitOps path below remains in the repo as the **future
real-cluster option** and is not used for the current demo.

Build locally:

```bash
docker build -f apps/api/Dockerfile -t api:local .
helm template api deploy/charts/api      # render the chart for review
```

## GitOps

`deploy-staging.yml` / `deploy-prod.yml` implement the pattern: **build & push image → bump the image tag in your gitops repo → wait for ArgoCD to sync & become healthy** (`.github/actions/argocd-wait`). All infra-specific values are GitHub **variables/secrets** (no hard-coded names):

| Variable | Example |
|---|---|
| `CONTAINER_REGISTRY` | `ghcr.io/your-org` |
| `GITOPS_REPO` | `your-org/gitops-infra` |
| `GITOPS_VALUES_PATH_STAGING` / `_PROD` | `clusters/<c>/values/api/values-staging.yaml` |
| `ARGOCD_APP_STAGING` / `_PROD` | `api-staging` |

Secrets: `REGISTRY_USERNAME`/`REGISTRY_PASSWORD`, `GITOPS_TOKEN`, `ARGOCD_SERVER`/`ARGOCD_TOKEN`, and (optional) `VERCEL_TOKEN`/`VERCEL_ORG_ID`.

The Helm chart (`deploy/charts/api/`) runs migrations as an ArgoCD PreSync hook with a deadline, so a stuck migration halts the rollout instead of hanging.

## Creating a New Product

1. Rename the workspace: set `name` in the root `package.json`; optionally keep the `@repo/*` package names (they're internal).
2. Define your first domain by **copying the `example` vertical**, then delete `example`:
   - `packages/db-backend/src/schema/example-entities.ts` → your table (+ `make db-generate`)
   - `packages/shared/src/schemas/example/` → your Zod contract
   - `apps/api/src/modules/example/` → your API module (register it in `app.module.ts` + the DI test)
   - `packages/client-core/src/hooks/example/` → your query hooks
   - `apps/web/src/features/example/` + `apps/web/src/app/routes/_app/example.tsx` → your UI
3. Update the sidebar nav (`apps/web/src/shared/components/layout/data/sidebar-data.ts`).
4. Wire deployment variables/secrets (see GitOps above) and your Supabase project.
5. Run `make check` and `make local:dev` to confirm green + booting.

The layer-scaffolder skills (`new-drizzle-table`, `new-shared-schema`, `new-api-module`, `new-client-hook`, `new-frontend-feature`) automate steps 2–3.

## Customization Guide

- **Branding:** `apps/web/index.html` (title), `apps/web/src/shared/assets/logo.tsx` (logo), `apps/web/src/globals.css` (`--brand` color tokens + theme), `sidebar-data.ts` (team name + nav).
- **Auth:** Supabase by default (`apps/web/src/shared/lib/supabase.ts`, `apps/api/src/auth/`). The `local-dev-auth-service` bypass is for local only.
- **Error reporting / tracing:** none wired by default. Add Sentry/Rollbar in `apps/api/src/common/filters/http-exception.filter.ts` and OpenTelemetry/Langfuse where you need it.
- **Queues:** the `example` BullMQ queue + Bull Board dashboard (`/queues`) in `apps/api/src/queue/` is a working reference.
- **Conventions:** `CLAUDE.md` (root + per-package) encodes the engineering rules; `AGENTS.md` holds agent-facing instructions (including the deploy runbook). Agent skills live in `.agents/skills` and `.claude/skills`.
