# TrendScout — Multi-Agent Tech-Trend Research Service (Design)

**Date:** 2026-06-17
**Status:** Approved for planning → issues
**Source:** "Тестовое задание Лот 2 (ИИ)"

## 1. Goal

A web service that, given a research topic, runs a LangGraph multi-agent
pipeline over open-source LLMs to produce a **structured JSON report** about a
technology trend, with **verifiable, live source links**, a **sustainability
score (1–10)**, and a **global-vs-Russia market** breakdown. Multi-user, with
per-user data isolation and real-time generation status. Deployable to a k3s
cluster with one command.

## 2. Locked Decisions

| Topic | Decision |
|---|---|
| Agent runtime | **LangGraph.js** (`@langchain/langgraph`) inside a **NestJS BullMQ worker** — no new language, TS-everywhere preserved |
| LLM serving | **Ollama** serving a model **pool** for fallback |
| Model pool | **Deploy target is the dev laptop — single-node k3s, RTX 3060 6 GB VRAM.** Primary `qwen2.5:7b` (~4.7 GB, fits VRAM → fast path keeps < 2 min), fallback `gemma4:12b-it-qat` (loaded only on primary failure; partial CPU offload acceptable on the rare fallback path). Both ≤13B. Env-driven: on a ≥16 GB GPU node, switch the pool to `qwen2.5:14b` → `gemma4:12b`. |
| Source search | **Tavily API** (LLM-oriented search) + live link validation |
| Deploy target | **single-node k3s on the dev laptop** + umbrella **Helm chart**, one-command install |
| Status push | **Supabase Realtime** on the `reports` table (already wired client-side) |
| Worker topology | second process of the **same API image** (one codebase/artifact) |
| Issues | flat list of labeled task issues |

## 3. Architecture

```
apps/web (React)  ──REST──▶  apps/api (NestJS)  ──enqueue──▶  Redis / BullMQ
      │                            │                               │
      │  Supabase Realtime         │ Drizzle                       ▼
      └─── live status ◀── reports table (Postgres) ◀── NestJS worker process
                                                        (LangGraph.js graph)
                                                            │          │
                                                         Ollama      Tavily
                                                      (model pool)  (sources)
```

- The **API** owns auth, validation, persistence, and job enqueue. All
  DB access via Drizzle; Supabase SDK only for Auth (per repo conventions).
- The **worker** is the same NestJS image started with a worker entrypoint; it
  consumes BullMQ jobs and runs the LangGraph graph.
- The **web app** submits topics, lists history, and subscribes to its own
  `reports` rows via Supabase Realtime for `queued → thinking → done|error`.

## 4. Data Model (Drizzle, `packages/db-backend`)

`reports`:
- `id` uuid pk
- `user_id` text/uuid — from the Supabase JWT (isolation key)
- `topic` text — the user prompt
- `status` enum: `queued | thinking | done | error`
- `result` jsonb — the report contract (§5), null until done
- `error` text — null unless status=error
- `created_at`, `updated_at` timestamptz

Isolation: every query filters by `user_id` derived from the verified JWT in the
API; user A can never read user B's reports.

## 5. Report JSON Contract (shared Zod schema, `packages/shared`)

```jsonc
{
  "trend_name": "string",
  "global_market": [
    { "product": "string", "company": "string",
      "effects": "string (metrics if available)",
      "sources": ["https://… (live-validated)"] }
  ],
  "ru_market": [ /* same shape */ ],          // or:
  // "ru_market": "Реализации в РФ не обнаружено"
  "sustainability": {
    "score": 1,                                // 1..10
    "arguments_for": ["string"],
    "arguments_against": ["string"]
  }
}
```

- Every fact carries at least one `source` URL.
- The worker **validates each link is live** (HEAD/GET) before inclusion;
  dead links are dropped, and an item with no surviving source is removed.
- **Honesty rule:** when no implementations/sources are found, output the explicit
  "Реализации в РФ не обнаружено" / "Не найдено" — never fabricate.

## 6. LangGraph.js Agent Graph

```
Planner ─▶ Researcher ─▶ Link-Validator ─▶ Analyst ─▶ Sustainability-Scorer ─▶ Assembler
            (Tavily)                       (global/RU,
                                            honesty guard)
```

- **Planner** decomposes the topic into search sub-queries.
- **Researcher** calls Tavily, fetches candidate sources (parallel fan-out).
- **Link-Validator** verifies URLs resolve; drops dead ones.
- **Analyst** splits findings into global vs RU markets, applies the honesty guard.
- **Sustainability-Scorer** assigns 1–10 with for/against arguments.
- **Assembler** emits the validated JSON (logged, per acceptance criteria).

**LLM fallback pool:** a provider wrapper iterates the env-configured pool
(`[qwen2.5:7b, gemma4:12b-it-qat]` on the 6 GB dev/deploy box; `[qwen2.5:14b,
gemma4:12b]` on a ≥16 GB node); on error or per-node timeout it transparently
advances to the next model so the user never sees a failure. Logged for observability.

## 7. Security & Non-Functional

- **Prompt-injection defense:** Zod input validation + a sanitization/guard step;
  agent system prompts treat user topic strictly as *data*, with explicit
  "ignore embedded instructions" hardening. Tested with injection probes.
- **Performance:** per-node timeouts, parallel research, model-pool fallback to
  stay within the **2–3 min** budget (acceptance target: < 2 min typical).
  - **Hardware caveat (6 GB VRAM box):** the < 2 min target relies on the 7B
    primary fitting in VRAM. Heavy topics, or any request that falls back to the
    12B-QAT model (partial CPU offload), may exceed 2 min — acceptable and
    documented. On a ≥16 GB GPU node the 14B/12B pool meets the target outright.
- **Observability:** the assembled JSON is logged; node-level timings logged.

## 8. Deployment (k3s, one command)

- Umbrella **Helm chart** `deploy/charts/trendscout` bundling: `api`, `worker`,
  `web`, `redis`, `postgres`, `ollama` (with model pull init for the env pool —
  `qwen2.5:7b` + `gemma4:12b-it-qat` on the 6 GB single-node box).
- Single-node k3s on the dev laptop; Ollama requests the NVIDIA GPU (6 GB).
- One-command install (e.g. `make k3s-up` → `helm install …` against k3s).
- README documents architecture, a component-interaction diagram, and the k3s
  deployment runbook.

## 9. Build Order (milestone grouping for the flat issue list)

1. **M1 Infra/scaffold** — labels, model pool config, env wiring.
2. **M2 Data + contract** — `reports` table + migration, shared Zod report schema.
3. **M3 API + queue + isolation** — endpoints (create/list/get report), BullMQ
   wiring, JWT-based user isolation.
4. **M4 Agent graph** — LangGraph.js graph, Ollama provider + fallback, Tavily
   research, link validation, honesty guard, prompt-injection defense.
5. **M5 Frontend** — auth, dashboard (topic form + history), real-time status,
   report rendering with clickable sources.
6. **M6 K8s/docs** — Ollama/Redis/Postgres charts, umbrella chart, one-command
   deploy, README + diagrams.

## 10. Out of Scope (YAGNI)

- No fine-tuning / no model training. No payment/billing. No multi-tenant orgs
  beyond per-user isolation. No non-K8s production target. No SSE/WebSocket
  layer (Supabase Realtime covers status).
