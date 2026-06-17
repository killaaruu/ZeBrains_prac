# Project Conventions

## Stack

- **Language:** TypeScript everywhere, strict mode
- **Runtime:** Node.js 24 LTS
- **Package manager:** pnpm (never npm or yarn)
- **Monorepo:** Turborepo with pnpm workspaces
- **Linter + Formatter:** Biome (single tool, no ESLint/Prettier)

## Core Principles

- **TDD is NON-NEGOTIABLE.** Every code change follows Red-Green-Refactor. Write a failing test FIRST, then minimal code to pass, then refactor. Never write production code without a failing test. (Red/Green/Refactor mechanics: `superpowers:test-driven-development`. Per-package exceptions, e.g. `tools/system-board`, are declared in that package's own CLAUDE.md.)
- **YAGNI.** Start with the simplest solution. Do not build features, abstractions, or infrastructure not needed by the current task.
- **Document language:** code, comments, commit messages, and documentation in English.

## Architecture

- Turborepo monorepo: `apps/api`, `apps/web`, `packages/*`, `tools/*`
- All data reads/writes go through the NestJS API via REST endpoints
- Backend accesses Postgres directly via Drizzle (NOT the Supabase SDK for DB queries)
- Supabase SDK on the backend is allowed for non-DB functionality only — Storage signed URLs, Auth admin — never for table reads/writes (use Drizzle)
- On the client, the Supabase SDK is used for Auth, Realtime, and Storage (direct browser → Supabase uploads via signed URLs)
- Supabase services consumed by client features are abstracted behind interfaces in `packages/services-client`
- The `example` domain (table → schema → API module → client hook → web feature) is a working end-to-end reference — copy it when adding a new domain, then delete it.

## Import Rules

```
✅ features/X  →  @repo/client-core     (shared hooks + stores)
✅ features/X  →  @repo/shared           (types, schemas, utils)
✅ features/X  →  @repo/services-client  (auth, realtime, storage)
✅ features/X  →  @/shared/components        (app-level generic UI)
✅ features/X  →  ./components, ./hooks       (own feature internals)

❌ features/X  →  features/Y                  (cross-feature import)
❌ features/X  →  app/                        (never import from routes)
```

Inside a feature, import your **own** files relatively (`./`, `../`). Import `@/shared` / `@repo/client-core` for shared code, and `app/` never. The two `❌` rules above are enforced in CI by Biome `noRestrictedImports` (scoped to `apps/web/src/features/**` in `biome.json`), so they fail `make check`.

If two features need to share logic:
- `@repo/client-core` — if multiple apps need it
- `@/shared/` — if only this app needs it

## Feature Folder Rules

- Routes (`app/`) are thin — import from `features/`, render, done
- Features never import from other features
- Each feature has an `index.ts(x)` barrel export — only exported items are public API
- New feature folder = new user-facing domain concept

## State Management

- **Server state:** TanStack Query (shared hooks in `client-core`)
- **Local state:** Zustand (shared store creators in `client-core`)
- **Form state:** React Hook Form + Zod (shared Zod schemas in `shared`)

## Dev Flows (skill orchestration)

Single planning system: **superpowers**. All work flows through one of these.

| Flow | Chain |
|---|---|
| **A — Feature work (any size)** | `[explore-codebase if unfamiliar]` → `brainstorming` → `writing-plans` → `executing-plans` (scaffolders for greenfield layers; `test-driven-development` for edits) → `verification-before-completion` |
| **B — Stacked layer additions** | Canonical spine (data → contract → api → client → ui): `new-drizzle-table` → `db-migrate` → `new-shared-schema` → (`new-api-module` \| `new-api-endpoint`) → `sync-api-contract` → `new-client-hook` → `new-frontend-feature` → `/verify` |
| **C — Bugs** | `[explore-codebase if needed]` → `systematic-debugging` → `test-driven-development` (failing test reproducing bug, then fix) → `verification-before-completion` |

After non-trivial work: optionally `/simplify` to dedupe / improve the diff.

## Verification

- All commands go through the `Makefile` (single entry point) — run `make help` to list targets. Use `make <target>`, not raw `turbo`/`pnpm`, in code and docs.
- Use the `/verify` skill for the full verification protocol. Human-readable backing reference: `docs/dev-commands.md`.
- Before committing → run `make check`.
- For unfamiliar code, run `explore-codebase` before editing.

## Git Workflow

- Work on feature branches, never commit directly to `main` or `master`
- Before starting work: `git fetch origin && git status` to understand current state
- Commit messages: conventional commits format — `type(scope): description`
  - Types: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `ci`, `perf`, `style`, `build`
- Use `git add <specific-files>` not `git add -A` (avoid committing unrelated changes)
- **Pre-push gate (mandatory)**: before every `git push`, run in order (`make gate` runs steps 1–2):
  1. `make format` at repo root — Biome with `--write`. If anything was rewritten, stage and commit as a separate `style(<scope>): apply biome format` commit.
  2. `make check` — must be green. If it fails, fix locally, re-run the gate.
  3. Only then `git push`.
  CI runs the same `make check`, so anything skipped locally will block the PR — auto-generated Drizzle migration snapshots are a common offender.
- After pushing: create the PR with `gh pr create` and verify CI with `gh pr checks`

## Dev Environment

Default local startup is `make local` (worktree-safe: Postgres + Redis via `docker-compose.local.yml`, free ports per worktree, migrations applied, API + web started, env under `.local-env/`). It boots without a real Supabase by using a local-dev auth bypass; point it at a real Supabase by exporting `LOCAL_DEV_SUPABASE_URL` / `LOCAL_DEV_SUPABASE_PUBLISHABLE_KEY` / `LOCAL_DEV_SUPABASE_SERVICE_ROLE_KEY`. Use `make local-e2e` for API e2e that needs local infra. For UI work, start `make local` and verify in a browser before reporting completion. Details: `docs/dev-commands.md`.

## NestJS DI Rules (Critical)

- **Never `import type` for injectable classes** — stripped at compile time, breaks DI metadata. Biome's `useImportType` rule is disabled for `apps/api/` in the root `biome.json`.
- **Interface constructor params need `@Inject(SYMBOL_TOKEN)`** — interfaces emit `Object` in metadata.
- **Module DI compilation test** at `apps/api/src/app.module.test.ts` catches DI wiring errors. Keep it updated when adding modules.

## MCP Tools

- **Context7** — fetches current, version-specific library docs; prevents hallucinated APIs. Use before Drizzle ORM relations / complex queries and for TanStack Query v5 patterns. Configured in `.mcp.json`.

## Ops / Deploy

Deployment is GitOps + ArgoCD (see `.github/workflows/deploy-{staging,prod}.yml` and the Helm chart in `deploy/charts/api/`). Only the API is containerized; the web app deploys to Vercel (optional). Registry, cluster, namespace, gitops repo, and ArgoCD app names are supplied via GitHub repo **variables/secrets** — there are no hard-coded infra names in this template.

Adding or changing an env var is NOT just `.env` / `.env.example` — the value must also be wired into your deployment (Helm values / gitops secret) and verified on the running pod after the deploy syncs. Use the `deploy-env-var` skill for the decision algorithm.
