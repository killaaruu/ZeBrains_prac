# System Board — Working Rules

`@repo/system-board` is an **internal developer tool** (a Vite + React viewer over an
auto-generated map of the monorepo). It is not shipped to users and is not part of any
production deploy. Optimize for speed of iteration, not ceremony.

## Rules (override the root CLAUDE.md for this package)

- **No TDD.** Do not write a failing test first. Write code directly. Tests are optional
  here — add one only when it genuinely helps, not as a process gate.
- **No code-review gate.** Do not run spec-compliance or code-quality review subagents
  for changes scoped to `tools/system-board/`. Just make the change.
- **No subagent-driven bundle/review loop** for this package. Implement inline.

## Still expected (lightweight, not a gate)

- Keep `pnpm --filter @repo/system-board typecheck` passing.
- Run `pnpm --filter @repo/system-board build` if you touched the generator or viewer entry.
- Follow the existing structure: generator logic in `src/generator/`, viewer in `src/viewer/`,
  curated content in `content/`. Each file keeps one clear responsibility.
- Commit messages: conventional commits, **no `Co-Authored-By` trailer** (repo-wide rule).
- `system-map.generated.json` and `dist/` are gitignored — never commit them.

## What it does (orientation)

- **Generator** (`src/generator/`): scans the monorepo by slug/NestJS-module convention
  + curated `content/products.yaml` → `system-map.generated.json`.
- **Viewer** (`src/viewer/`): hash-routed tabs — Graph (React Flow canvas) and Modules
  (grid of all NestJS modules → detail pages with drill-down). Zed deep links to source.
- **Run:** `pnpm --filter @repo/system-board dev` (watch + dev server),
  `… generate` (one-shot), `… build` (static export).
