# TrendScout — Multi-Agent Tech-Trend Research

A web service that, given a research topic, runs a **LangGraph multi-agent pipeline** over open-source LLMs to produce a structured JSON report about a technology trend, with verifiable live source links, a sustainability score (1–10), and a global-vs-Russia market breakdown. Multi-user, with per-user data isolation and real-time status via Supabase Realtime. Deployable to a local k3s cluster with one command.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  apps/web (React SPA) ──REST──▶ apps/api (NestJS)              │
│       │                                    │                   │
│       │  Supabase Realtime                 │ Drizzle            │
│       └─── live status ◀── reports table ◀─┘                   │
│                                         (PostgreSQL)           │
│                                            │                   │
│                                       BullMQ/Redis              │
│                                            │                   │
│                                            ▼                   │
│  ┌── NestJS Worker (same image) ──────────────────────────┐   │
│  │  ┌────────── LangGraph StateGraph ─────────────────┐   │   │
│  │  │                                                  │   │   │
│  │  │  input-guard (1s) ──▶ planner (10s) ──▶         │   │   │
│  │  │     researcher (8s, Tavily) ──▶ link-validator  │   │   │
│  │  │     (10s) ──▶ analyst (20s) ──▶                  │   │   │
│  │  │     sustainability-scorer (15s) ──▶ assembler   │   │   │
│  │  │     (10s) ──▶ END                                │   │   │
│  │  └──────────────────────────────────────────────────┘   │   │
│  │              │                    │                      │   │
│  │           Ollama                Tavily                    │   │
│  │        (model pool)            (sources)                 │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### Components

| Layer | Tech | Role |
|---|---|---|
| **Frontend** | React 19 + Vite + TanStack Router/Query | Auth, topic submission, report history, real-time status |
| **API** | NestJS 11 + Drizzle ORM | Auth (Supabase JWT), validation, persistence, job enqueue |
| **Worker** | Same NestJS image, worker entrypoint | Consumes BullMQ jobs, runs the LangGraph agent graph |
| **Queue** | Redis + BullMQ | Decouples API from long-running agent execution |
| **LLM** | Ollama model pool | Serves `qwen2.5:7b` (primary) / `gemma4:12b-it-qat` (fallback) |
| **Search** | Tavily API | LLM-oriented web search for source gathering |
| **DB** | PostgreSQL 16 | `reports`, `profiles` tables, Drizzle migrations |
| **Realtime** | Supabase Realtime | Pushes `queued → thinking → done|error` status to the browser |

### LangGraph Agent Flow

The agent is a 7-node sequential `StateGraph` with per-node timeouts:

```
START → input-guard → planner → researcher → link-validator
        → analyst → sustainability-scorer → assembler → END
```

| Node | Timeout | Function |
|---|---|---|
| `input-guard` | 1s | Zod-validates topic, wraps in prompt-injection guard |
| `planner` | 10s | Decomposes topic into 4 search sub-queries (RU + EN) |
| `researcher` | 8s | Tavily fan-out across sub-queries, dedupes by URL |
| `link-validator` | 10s | HEAD/GET each URL (concurrency 3, 1.5s per link) |
| `analyst` | 20s | LLM splits sources into `global_market` / `ru_market` |
| `sustainability-scorer` | 15s | LLM produces 1–10 score with for/against arguments |
| `assembler` | 10s | Validates final JSON against Zod schema, logs it |

**LLM fallback pool:** on any node error or timeout, the provider transparently advances to the next model in the pool — the user never sees a failure. Logged for observability.

**Commenting convention** for agent code: every node function has a one-line comment stating its purpose and timeout. Complex branching (e.g. analyst fallback to deterministic extraction) is documented inline. See `apps/api/src/worker/report-generation.graph.ts`.

## Data Model

### `reports` table

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid PK` | `defaultRandom()` |
| `user_id` | `text` | From Supabase JWT (isolation key) |
| `topic` | `text` | User's research prompt |
| `status` | `report_status` enum | `queued → thinking → done | error` |
| `result` | `jsonb` | Null until done; validated by `reportResultSchema` |
| `error` | `text` | Null unless `status=error` |

Every query filters by `user_id`. User A can never read user B's reports.

### `profiles` table

Maps Supabase Auth UIDs to app-level profiles with role (`user`/`admin`) and status.

## Report JSON Contract

```jsonc
{
  "trend_name": "string",
  "global_market": [
    { "product": "string", "company": "string",
      "effects": "string (metrics)",
      "sources": ["https://… (live-validated)"] }
  ],
  "ru_market": [ /* same shape */ ],
  "sustainability": {
    "score": 1,                  // 1..10
    "arguments_for": ["string"],
    "arguments_against": ["string"]
  }
}
```

Zod schema in `packages/shared/src/schemas/report/`. Every fact carries at least one live source URL. When no sources are found, outputs `"Реализации в РФ не обнаружено"` — never fabricates.

## Local Development

Requires Docker + Node 24 + pnpm.

```bash
pnpm install
make local         # Postgres + Redis + migrations + API + web
```

`make local` uses `docker-compose.local.yml` (worktree-safe ports, no real Supabase needed — a local-dev auth bypass is seeded). See `docs/dev-commands.md`.

```bash
make local-e2e     # API e2e against the prepared local env
make web           # web dev server only
make check         # format + typecheck + test + build (full gate)
```

## One-Command k3s Deploy

Deploys the entire stack (API, Worker, PostgreSQL, Redis, Ollama) to a local k3s cluster in WSL2.

### Prerequisites

- Windows 11 with **WSL2** (`Ubuntu-24.04` distro)
- **NVIDIA GPU** (RTX 3060 6 GB tested) with CUDA-on-WSL driver
- **Docker Desktop** with WSL2 backend
- **Helm** CLI installed on Windows
- **kubectl** CLI installed on Windows

### Deploy

```bash
make k3s-up
```

This single command:
1. Ensures k3s is running in WSL2 (starts it if missing)
2. Copies the kubeconfig from WSL2 to Windows
3. Builds the API Docker image
4. Loads the image into k3s containerd
5. Creates the `trendscout` namespace + `api-secrets` Secret
6. Deploys the umbrella Helm chart (`deploy/charts/trendscout/`) with all subcharts
7. Waits for deployments to become Available
8. Port-forwards the API to `localhost:3000`

### Manual steps if `make k3s-up` networking fails

Windows → WSL2 networking can be flaky. If `kubectl` or `helm` give `connection refused`:

```bash
# Run commands directly inside WSL2
wsl -d Ubuntu-24.04 -u root bash
k3s kubectl get pods -n trendscout
k3s kubectl port-forward -n trendscout svc/trendscout-api 3000:3000 --address 0.0.0.0
```

### k3s clean-restart (when containerd state is stale)

If pods hang at `ContainerCreating` or containerd socket is unresponsive:

```bash
# Inside WSL2 as root
kill 14 2>/dev/null; sleep 3
rm -rf /var/lib/rancher/k3s/server/db
rm -f /var/log/k3s.log
setsid /usr/local/bin/k3s server --write-kubeconfig-mode 644 > /var/log/k3s.log 2>&1 &
sleep 30
k3s kubectl wait --for=condition=Ready nodes --all --timeout=60s
```

Then re-run `make k3s-up`. See `CLAUDE.md` "k3s clean-restart playbook" for details.

### Helm chart structure

```
deploy/charts/trendscout/
├── Chart.yaml            # Umbrella chart (5 file:// dependencies)
├── values.yaml           # Global defaults
├── charts/
│   ├── api/              # NestJS API Deployment + Service + Migration Job
│   ├── worker/           # Worker Deployment (same image, different command)
│   ├── redis/            # Redis Deployment + Service
│   ├── postgres/         # PostgreSQL StatefulSet + Service + Secret
│   └── ollama/           # Ollama Deployment + Service + PVC + Model Pull Job
```

### GPU configuration

Ollama requests the NVIDIA GPU via `nvidia.com/gpu`. On the dev laptop (RTX 3060 6 GB):

| Model | VRAM | Role |
|---|---|---|
| `qwen2.5:7b` | ~4.7 GB | Primary (fits VRAM, fast path < 2 min) |
| `gemma4:12b-it-qat` | ~7 GB | Fallback (CPU offload, > 2 min acceptable) |

Set `ollama.gpu.enabled=false` in `deploy/charts/trendscout/values.yaml` or via `--set` for CPU-only testing.

### Secrets (local dev)

The `api-secrets` Secret is created automatically by `make k3s-up` with these defaults:

| Key | Default value |
|---|---|
| `DATABASE_URL` | `postgresql://app:changeme@trendscout-postgres:5432/app_local` |
| `REDIS_URL` | `redis://trendscout-redis:6379/0` |
| `OLLAMA_URL` | `http://trendscout-ollama:11434` |
| `SUPABASE_URL` | `http://placeholder:54321` |
| `SUPABASE_ANON_KEY` | `placeholder-key` |
| `JWT_SECRET` | `local-dev-secret` |

For production, set real Supabase credentials via `kubectl create secret generic api-secrets --from-literal=...`.

## Monorepo Structure

```
apps/
  api/                 NestJS backend (modules/reports/, worker/, auth/, queue/)
  web/                 React + Vite SPA (features/, app/routes/)
packages/
  shared/              Zod schemas + inferred types + axios api-client
  client-core/         TanStack Query hooks + Zustand store factories
  services-client/     Supabase Auth/Realtime/Storage behind interfaces
  db-backend/          Drizzle schema + migrations
  config/              Shared tsconfig / vitest / biome bases
tools/
  local-env/           Worktree-safe local dev orchestrator
  system-board/        DDD documentation visualizer
deploy/
  charts/trendscout/   Umbrella Helm chart (k3s deploy)
  scripts/k3s-up.ps1   One-command deploy script
```

## CI/CD

- **CI** (`.github/workflows/ci.yml`): runs `pnpm turbo check` on every push/PR — format, typecheck, test, build.
- **Deploy API**: via GitOps + ArgoCD (`.github/workflows/deploy-{staging,prod}.yml`).
- **Deploy web**: optional Vercel deploy (needs `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_WEB_PROJECT_ID` in GitHub secrets).
- **Pre-push gate**: `make format && make check` — must be green before every push.

## Testing

```bash
make test                 # all packages
make test PKG=@repo/api   # one package
make local-e2e            # API e2e against real local infra
```

TDD is the default (Red → Green → Refactor). Tests live next to the code (`foo.ts` → `foo.test.ts`). See `CLAUDE.md` "TDD is NON-NEGOTIABLE" for per-package exceptions.
