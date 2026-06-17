# ADR-003: Keep a Modular Monolith for the API — Defer Microservices

**Date:** 2026-06-06
**Status:** Accepted
**Deciders:** @maxmrtnv

## Context

`apps/api` is a single NestJS deployment. As the surface grows (DataOS connectors,
financial calculation, sync monitoring, presale/outstaff flows), the recurring question
is whether to split the API into independently deployed microservices.

The current architecture is a **modular monolith**:

- Domain logic lives in cohesive modules under `apps/api/src/modules/` (e.g. `dataos/`),
  each scaffolded by `new-api-module`.
- Infra is decoupled behind **port interfaces** — `DbPort`, `QueuePort`, `SchedulerPort`,
  and tokens like `SYNC_DB_PORT`, `MAPPING_DB_PORT`, `CONNECTOR_REGISTRY`. Business logic
  depends on interfaces, not concrete infra.
- Connectors (Bitrix24, Google Sheets, YouTrack, GitLab, GitHub) and transformers
  implement `IConnector` / `ITransformer` — pluggable, manually constructed, individually
  testable.
- End-to-end type safety flows DB → API → client via the codegen chain
  (`new-api-module → sync-api-contract → new-client-hook`).
- A single Postgres (Drizzle) is the system of record; writes are wrapped in transactions.

Operationally, the platform already carries a non-trivial distributed-systems tax,
documented in agent memory and `docs/ops-runbook.md`:

- Prod K8s runs in Russia; Anthropic + most US APIs return 403 (egress geo-block),
  worked around by a dedicated `apps/gateway` or LiteLLM proxy.
- Supabase Kong OOM loops, NodeLocal DNSCache, "ArgoCD sync doesn't actually wait"
  (image must be verified after every push) — each added deployment multiplies these
  failure modes and verification steps.

Lean team, single deploy target per surface (API → K8s, web → Vercel, gateway → DO).

## Decision

**Keep the API as a modular monolith. Do not introduce domain-oriented microservices
until a concrete force (below) requires it.** Continue enforcing module boundaries through
port interfaces, barrel `index.ts` exports, and the import rules already enforced in CI
(Biome `noRestrictedImports`).

The port/adapter pattern already delivers the boundaries microservices are usually
adopted to obtain — clean seams, swappable infra, isolated tests — **without** converting
in-process calls into network calls, distributed transactions, and versioned contracts.

This is a direct application of the project's **YAGNI** core principle: do not build
infrastructure not needed by the current task.

### When to revisit (extraction triggers)

Extraction is a deployment decision enabled by the existing module boundaries, not an
architecture rewrite. Split when — and only when — a concrete force appears:

| Trigger (concrete, measured) | First candidate to extract |
|---|---|
| Background sync (BullMQ webhook processing) starves API request latency under load | A **worker process** — split by *runtime profile*, sharing the same repo and DB |
| A module needs independent scaling, a different runtime, or hard blast-radius isolation | That specific module |
| A module must call services blocked by RU egress | A gateway-style proxy (the precedent `apps/gateway` already set) |
| Divergent deploy cadence / separate team ownership becomes a real bottleneck | The high-churn module |

### Preferred first split: process, not codebase

If load is the trigger, split the **runtime profile** (HTTP request handlers vs. background
workers) before splitting the domain: one repository, one database, two entrypoints
(`main.ts` vs a `worker.ts`). This captures most of the scaling/isolation benefit at a
fraction of the operational cost, and keeps the codegen type-safety chain intact.

Domain-oriented microservices are a last resort, justified by a physical constraint —
the way `apps/gateway` was extracted to solve the Russian egress block, not adopted for
fashion or presumed scalability.

## Consequences

### Positive

- No distributed transactions: financial calculation, sync state, and mapping writes stay
  within a single Postgres transaction boundary.
- The DB → API → client type-safety chain (`sync-api-contract`) stays intact; no inter-service
  contract versioning or runtime contract testing.
- Operational surface stays minimal — one API deployment to build, push, verify-image, and
  monitor, instead of N. Existing infra gotchas are not multiplied.
- Module boundaries are still enforced (ports + barrel exports + CI import rules), so the
  *option* to extract a service later remains open at near-zero cost.

### Negative

- A single deployment scales as one unit; a hot module (e.g. heavy sync) cannot scale
  independently while it remains in-process. Mitigation: the runtime-profile split above,
  available without a domain rewrite.
- Larger single codebase and one build/test pipeline — acceptable given Turborepo caching
  and current team size.

### Neutral

- This ADR does not change any code. It records the standing decision and the explicit
  triggers for revisiting it, so the monolith-vs-microservices question does not need to be
  re-litigated ad hoc.
- `apps/gateway` is and remains a separate service — consistent with this ADR's rule that
  services are extracted to satisfy physical constraints, not by default.
- Supersede this ADR (do not silently drift) if a domain microservice is introduced;
  record which trigger forced it.
