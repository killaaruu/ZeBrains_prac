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

## Honesty
Report outcomes faithfully. If tests fail, say so with the real output. Never
claim "done" or "passing" without showing the green command output.
