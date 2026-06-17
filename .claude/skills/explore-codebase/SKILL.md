---
name: explore-codebase
description: Map a feature or area of the monorepo before editing — produces a "where to look + what to read first" report grounded in this repo's actual architecture. Use proactively before any non-trivial change to unfamiliar code, and when the user asks "how does X work", "where is Y", "what depends on Z".
argument-hint: "[feature or area name]"
---

# Explore the codebase

Produce a focused orientation report for `$ARGUMENTS` before any edit. Goal: in one pass, give Codex (and the user) the mental model needed to make changes safely.

## When to invoke

- Before editing code Codex has not touched in this session.
- When the user asks "how does X work / where is Y / what depends on Z".
- Before `superpowers:writing-plans` for any feature touching ≥2 layers.
- Before `superpowers:systematic-debugging` if the bug's surface is unfamiliar.

Skip when: the user already pointed at a specific file, or the change is trivially local (single function in a file Codex just read).

## Architecture map (use this as the search frame)

```
apps/
├── api/                     NestJS backend. Modules under src/modules/<domain>/
│                            (controller + service + module + dto/ + spec.ts).
│                            DI: never `import type` for injectables. Interface
│                            constructor params need @Inject(SYMBOL_TOKEN).
│                            example module: src/modules/example/ — reference
│                            domain showing the module conventions.
└── web/                     Vite + React (main app). Features under
                             src/features/<name>/ (components/, hooks/,
                             types.ts, index.tsx barrel). Routes (src/app/)
                             are thin. Ships via Vercel.

packages/
├── shared/                  Zod schemas (camelCaseSchema), inferred types,
│                            api-client (single axios instance — never new()).
│                            Blast radius: every consumer.
├── client-core/             TanStack Query hooks + Zustand stores. Shared by
│                            all web apps. Mandatory query-key-factory
│                            pattern. No new axios instances.
├── services-client/         Supabase abstractions (Auth, Realtime, Storage)
│                            behind interfaces. Client-side only.
├── db-backend/              Drizzle schema + migrations. UUID PKs, defaultNow
│                            timestamps. Backend-exclusive — apps/api consumes.
└── config/                  tsconfig.base, biome, shared turbo configs.
```

## Search strategy

For each query type, run these in parallel.

**"How does feature X work" / new layer addition**
- `apps/api/src/modules/<X>/` — backend domain
- `apps/web/src/features/<X>/` — UI
- `packages/client-core/src/hooks/use-<X>*` — query hooks
- `packages/shared/src/schemas/<X>*` — validation
- `packages/db-backend/src/schema/<X>*` — table

**"Where is Y defined" — symbol search**
Grep across `apps/` and `packages/` for the symbol. Note: `@repo/shared`, `@repo/client-core`, `@repo/services-client`, `@repo/db-backend` are workspace aliases.

**"What depends on Z" — reverse dep**
Grep for `import .* from '@repo/<pkg>'` and direct symbol usage. For DB tables: grep for the schema export name, not the table name string.

**Tests**
Tests live next to code: `foo.ts` → `foo.test.ts`. E2E for API: `apps/api/test/*.e2e-spec.ts`.

## How to delegate

For wide fan-out (≥3 likely locations), dispatch the `Explore` subagent with a self-contained prompt naming exact paths to look in and the symbols to grep. For a single targeted lookup, just grep / read directly.

## Output format (the report)

Keep under ~200 words. Structure:

1. **Layer map** — bulleted list of files that matter, grouped by package, with one-line role each.
2. **Read first** — 2-3 files Codex should fully read before any change.
3. **Conventions in this area** — anything non-obvious (e.g. "uses port pattern", "soft-delete via `deletedAt`", "tests stub Drizzle via `sql.js`").
4. **Blast radius** — which packages typecheck must run after edits.
5. **Suggested next skill** — the layer scaffolder or `superpowers:test-driven-development` to invoke for the actual change.

## Anti-patterns to flag if seen

- New axios instances in `client-core` → must use `http` from `@repo/shared/lib/api-client`.
- Backend code using Supabase SDK → backend reads/writes Postgres via Drizzle directly.
- `import type` for an injectable class in NestJS → strips DI metadata.
- Cross-feature imports in `apps/web/src/features/` → forbidden by AGENTS.md.
- Direct API calls bypassing the typed client (after `codegen-api`) → always go through `client-core` hooks.

## Forced next step

Hand off explicitly: name the next skill (`superpowers:writing-plans`, `superpowers:test-driven-development`, or a layer scaffolder) and the specific files to start with.
