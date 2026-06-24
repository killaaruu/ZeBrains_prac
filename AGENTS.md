# AGENTS.md — instructions for Codex (and other agents)

**Read `CLAUDE.md` in full first and follow it.** It is the authoritative
convention file for this repo. This file restates the non-negotiable rules and
adds Codex-specific guidance, because Codex has no skill system to enforce them
automatically — so they are written here as explicit instructions.

## Source of truth
- Design spec: `docs/superpowers/specs/2026-06-17-trendscout-design.md`
- Work is tracked in GitHub issues `#1–#24` (`gh issue list`). Build order is in
  the spec, §9 (M1 → M6). Do issues one at a time, in dependency order.

## Non-negotiable workflow (do these without being reminded)
1. **TDD.** Failing test first → minimal code to pass → refactor. Never write
   production code without a failing test. (Per-package exceptions are declared
   in that package's own CLAUDE.md.)
2. **One issue per branch/PR.** Branch from fresh main:
   `git fetch origin && git checkout main && git pull && git checkout -b feat/<name>`.
   Never commit directly to `main`/`master`.
3. **Pre-push gate (mandatory), in order:**
   1. `make format` (Biome `--write`). If it rewrote files, stage+commit them as
      a separate `style(<scope>): apply biome format` commit.
   2. `make check` — must be green. If it fails, fix locally and re-run the gate.
   3. Then `git push` → `gh pr create` (PR body must contain `Closes #<n>`) →
      `gh pr checks`.
4. **All commands via the `Makefile`** (`make help` lists targets) — never raw
   `turbo`/`pnpm` scripts where a target exists. Package manager is **pnpm** only.
5. **Conventional commits**: `type(scope): description`
   (`feat|fix|refactor|test|docs|chore|ci|perf|style|build`).
6. **Comment complex logic** — especially LangGraph agent nodes.
7. **YAGNI** — implement only the current issue's scope.

## Which skill for which task (NO auto-enforcement — you invoke it)
Codex does not auto-trigger skills. So **you must read and apply the matching skill in
`.agents/skills/<name>/SKILL.md` yourself** before doing that kind of work. Map the task to a flow:

- **A — Feature work (any size):** `explore-codebase` (if unfamiliar) → `brainstorm` (design
  before code) → strict-TDD implementation → `verify`. If the feature has UI in `apps/web`,
  also apply **`frontend-design`** before writing components.
- **B — Stacked layer additions** (data → contract → api → client → ui) — run the scaffolders
  in order, each with its test: `new-drizzle-table` → `db-migrate` → `new-shared-schema` →
  `new-api-module` → `codegen-api` → `new-client-hook` → `new-frontend-feature`
  (→ `frontend-design` for the visual layer).
- **C — Bugs / test failures / unexpected behavior:** `systematic-debugging` FIRST
  (reproduce → failing test → fix). Never guess-patch. Then `verify`.

Per-task triggers:

| When the task is… | Read & apply skill |
|---|---|
| Unfamiliar area before editing | `explore-codebase` |
| Designing a feature before code | `brainstorm` |
| New DB table / column | `new-drizzle-table` → `db-migrate` |
| New shared Zod contract | `new-shared-schema` |
| New API module / endpoint | `new-api-module` → `codegen-api` (verify contract) |
| New client data hook | `new-client-hook` |
| New UI feature folder | `new-frontend-feature` |
| **Any UI screen/component/styling in `apps/web`** | **`frontend-design`** |
| Any bug or failing test | `systematic-debugging` |
| Integration / e2e API coverage | `e2e-test` |
| New `@repo/*` workspace package | `new-package` |
| Verifying before claiming "done" | `verify` |
| Shipping a branch to staging | `ship-to-staging` |
| Modeling / documenting a domain | `ddd-doc` |

**Stages with no dedicated Codex skill — do them by procedure (follow `CLAUDE.md`):**
- **Add/change an API env var:** update `apps/api/src/config/env.validation.ts` (Zod) **and**
  `apps/api/.env.example`, **and** wire the value into the deployment (Helm values in
  `deploy/charts/api/` + the gitops secret), then verify it on the running pod after the sync.
  An env var is never just `.env` — see `CLAUDE.md` "Ops / Deploy".
- **Deploy / infra (k3s, Helm, ArgoCD):** only the API is containerized; web → Vercel. Edit the
  Helm chart under `deploy/charts/api/`; infra names come from GitHub repo vars/secrets, never
  hard-code them. Confirm the rollout synced before reporting done.
- **Record an architecture decision:** write an ADR in `docs/adr/NNN-kebab-title.md`
  (`## Context / ## Decision / ## Consequences`); mirror an existing sibling.
- **Realtime status UI (Supabase Realtime):** consume it through `@repo/services-client`
  (never the Supabase SDK directly in a feature) + a `new-client-hook`, rendered by a
  `new-frontend-feature` (+ `frontend-design`).

These task types map to the roadmap milestones **M1→M6** in the design spec (§9): backend/data
first, then the M5 dashboard UI, then M6 deploy/infra/docs.

`/impl-issue <N>` already enforces TDD + the pre-push gate; layer the skills above on top by task type.
This table mirrors the "Dev Flows" table in `CLAUDE.md` — keep the two in sync if either changes.

## Stack (full detail in CLAUDE.md)
TypeScript strict · Node 24 · pnpm · Turborepo · NestJS API (Drizzle, BullMQ,
Supabase Auth) · React web (TanStack Query/Router, Tailwind, Supabase Realtime)
· Biome (lint+format). Agent runtime: LangGraph.js in a NestJS BullMQ worker;
LLMs via Ollama pool `qwen2.5:14b` → `gemma4:12b`; sources via Tavily; deploy to
k3s via Helm.

## Architecture rules (enforced in CI by Biome — they fail `make check`)
- Features never import other features or from `app/` (see CLAUDE.md "Import Rules").
- All DB reads/writes via **Drizzle**, never the Supabase SDK for table access.
- NestJS DI: never `import type` for injectable classes; interface constructor
  params need `@Inject(SYMBOL_TOKEN)`. Keep `apps/api/src/app.module.test.ts` updated.
- When adding a new domain, copy the working `example` domain end-to-end, then delete it.

## MCP
- **Context7** is configured (`~/.codex/config.toml`) for current, version-specific
  library docs. Use it before non-trivial Drizzle relations/queries and TanStack
  Query v5 patterns — prefer it over guessing APIs.

## Custom prompts available (in `~/.codex/prompts/`)
- `/impl-issue <N>` — implement a single GitHub issue end-to-end (TDD → gate → PR closing it).
- `/verify` — run the full verification gate and report honestly.
- `/brainstorm <topic>` — design-before-code flow; writes a spec, no code until approved.

## Deployment (live demo) — read before touching deploy
Full guide: `docs/deployment.md`. The model in 3 lines:
1. The **API + report worker run locally on a GPU host** (they need local Ollama).
2. They are exposed through a **stable ngrok reserved domain**
   (`https://your-app.ngrok-free.dev` → `localhost:3111`).
3. The **web frontend is on Vercel** (`trendscout-stage`,
   `https://trendscout-stage.vercel.app`) and reaches the API via that domain.

- **Bring the API online:** `make demo` on the GPU host (Postgres+Redis, migrations,
  API, worker, ngrok). Stop with `make demo-stop`. Config in `.demo.env`
  (gitignored; copy from `.demo.env.example`).
- **Redeploy the web app:** push to `staging`
  (`.github/workflows/deploy-staging.yml`), or manually
  `npx vercel pull/build/deploy` (see `docs/deployment.md`). Both read the API URL
  from the Vercel project env var — never pass it in.
- **`VITE_API_URL` lives on the Vercel project** and is the single source of truth
  for the API URL. The ngrok domain is **stable**, so it is set once and never
  changes — do **not** hardcode tunnel URLs in workflows again (that caused the old
  "redeploy with new tunnel URL" churn).
- **Do NOT** resurrect the dead `trycloudflare` tunnel or the `cors-patch.js` /
  `patch-cors.sh` runtime CORS patching — CORS lives in `apps/api/src/bootstrap.ts`.
- **Do NOT** re-add the `build-api` / `deploy-api` (Docker → registry → ArgoCD) jobs
  to the deploy workflows unless a real cluster/registry/gitops is configured. The
  Helm chart under `deploy/charts/` + ArgoCD remain as the future real-cluster path,
  not used for this demo.
- For API env-var changes use the **`deploy-env-var`** skill.

## Honesty
Report outcomes faithfully. If tests fail, say so with the real output. Never
claim "done" or "passing" without showing the green command output.

## Local hardware profile (the developer's machine)
- OS: Windows 11 Pro · CPU: Intel i5-10500H (6c/12t) · RAM: 32 GB
- GPU: **NVIDIA RTX 3060 Laptop — 6 GB VRAM** (driver 610.x)

**Implication for the LLM pool.** 6 GB VRAM does **not** fit a 12–14B model at Q4
(`qwen2.5:14b` ≈ 9 GB, `gemma4:12b` ≈ 7 GB). On this machine they run with partial
CPU offload — slower; the "< 2 min" target may not hold locally. The ≤13B and
< 2 min requirements are about the **deployed** system on proper GPU hardware,
NOT this dev laptop.

**k3s for this project runs on this same laptop (single node, 6 GB GPU)** — so
the dev box IS the deploy target. Make `LLM_MODEL_POOL` env-driven:
- **Default (this 6 GB box):** primary `qwen2.5:7b` (~4.7 GB, fits VRAM → keeps
  the < 2 min target on the hot path), fallback `gemma4:12b-it-qat` (loaded only
  on primary failure; partial CPU offload acceptable there). Both ≤13B.
- **If a ≥16 GB GPU node is used later:** switch the pool via env to
  `qwen2.5:14b` → `gemma4:12b`. No code change — just the env var.

Honesty caveat: on 6 GB, heavy topics or any fallback to the 12B-QAT model may
exceed 2 min. That is expected and should be documented, not hidden.
