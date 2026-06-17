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
- For new stacked layers, prefer the repo scaffolder skills
  ($new-drizzle-table, $new-shared-schema, $new-api-module, $new-api-endpoint,
  $new-client-hook, $new-frontend-feature) and mirror the `example` domain.
- Comment complex logic, especially LangGraph agent nodes.

## Pre-push gate (in order)
1. `make format` — if it rewrote files, a separate commit `style(scope): apply biome format`.
2. `make check` — must be green; if it fails, fix locally and re-run.
3. `git push`, then `gh pr create` with a body containing `Closes #<N>`, then `gh pr checks`.

Conventional commits: `type(scope): description`. Finish with an honest report:
what was done, which tests, CI status — with the real command output.
