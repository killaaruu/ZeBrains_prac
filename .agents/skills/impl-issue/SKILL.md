---
name: impl-issue
description: Implement a single GitHub issue end-to-end with strict TDD, the mandatory pre-push gate, and a PR that closes it. Use when the user says "сделай issue N", "/impl-issue N", "implement issue N", or wants to work the next task in the TrendScout roadmap.
argument-hint: "[issue number]"
---

# Implement a GitHub issue end-to-end

Implement the GitHub issue whose number the user provides (the argument).

## First, gather context
1. Read `AGENTS.md` and `CLAUDE.md` in full — follow them.
2. Read `docs/superpowers/specs/2026-06-17-trendscout-design.md` (source of truth);
   find the section the issue references.
3. Run `gh issue view <N>` — read the task and acceptance criteria.

## Execution rules
- `git fetch origin && git checkout main && git pull`, then a new branch
  `feat/<short-name>`. Never commit to `main`.
- **Strict TDD**: failing test first → minimal code to pass → refactor. No production
  code without a failing test.
- Implement ONLY the scope of this issue. YAGNI.
- Use `pnpm` and the `Makefile` (`make help`), never raw npm/turbo.
- **Route the work to the right skill** (see `AGENTS.md` → "Which skill for which task").
  Codex has no auto-trigger, so read and apply the matching `.agents/skills/<name>/SKILL.md`
  yourself based on the issue's type:
  - Stacked layers: `new-drizzle-table` → `db-migrate` → `new-shared-schema` →
    `new-api-module` → `codegen-api` → `new-client-hook` → `new-frontend-feature`,
    mirroring the `example` domain.
  - **Any UI in `apps/web`** (screen/component/styling): apply **`frontend-design`** before
    writing components.
  - A bug or failing test: `systematic-debugging` first (reproduce → failing test → fix).
  - Unfamiliar area: `explore-codebase` first. Integration coverage: `e2e-test`.
- Comment complex logic, especially LangGraph agent nodes.

## Pre-push gate (in order)
1. `make format` — if it rewrote files, a separate commit `style(scope): apply biome format`.
2. `make check` — must be green; if it fails, fix locally and re-run.
3. `git push`, then `gh pr create` with a body containing `Closes #<N>`, then `gh pr checks`.

Conventional commits: `type(scope): description`. Finish with an honest report:
what was done, which tests, CI status — with the real command output.
