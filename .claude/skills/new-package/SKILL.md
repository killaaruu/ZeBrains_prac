---
name: new-package
description: Scaffold a new packages/X workspace package with correct tsconfig, pnpm workspace conventions, barrel export, CLAUDE.md, and Turbo pipeline registration. Use when extracting shared code into its own package, adding a new @repo/* library, or when the user asks to "create a new package", "add a workspace package", "make a new @repo/ library", or "scaffold packages/X".
---

# Create a new workspace package

Scaffold a new package at `packages/<package>/` with correct monorepo conventions. Take the package name from the user's request (or the upstream chain step that invoked this skill); below, `<package>` is that name (published as `@repo/<package>`).

Reference `packages/client-core/package.json` and `packages/client-core/tsconfig.json` as the templates to follow.

## Target structure

```
packages/<package>/
├── package.json      # @repo/<package>, correct scripts and workspace deps
├── tsconfig.json     # extends @repo/config/tsconfig.base.json, composite: true
├── src/
│   └── index.ts      # Barrel export stub
└── CLAUDE.md         # Package purpose, exports, dependents, commands
```

## Step 1: Read existing packages for conventions

Before creating files, read:
- `packages/client-core/package.json` — for script names, peer deps pattern
- `packages/client-core/tsconfig.json` — for tsconfig inheritance pattern
- `pnpm-workspace.yaml` (root) — verify `packages/*` is included (it should be)

## Step 2: Create `package.json`

```json
{
  "name": "@repo/<package>",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "exports": {
    ".": "./src/index.ts"
  },
  "scripts": {
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "format": "biome check --write ."
  },
  "devDependencies": {
    "@repo/config": "workspace:*",
    "typescript": "catalog:"
  }
}
```

Adjust `dependencies`/`devDependencies` based on the package's purpose. Consult the plan or user for what the package needs.

## Step 3: Create `tsconfig.json`

```json
{
  "extends": "@repo/config/tsconfig.base.json",
  "compilerOptions": {
    "composite": true,
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src/**/*"]
}
```

`composite: true` is required for Turbo's incremental build pipeline.

## Step 4: Create `src/index.ts`

```typescript
// @repo/<package> — [describe package purpose here]
// Add exports as the package grows.
```

## Step 5: Create `CLAUDE.md`

Document the package so agents know when and how to use it:

```markdown
# @repo/<package>

## Purpose

[Describe what this package provides and why it exists as a separate package]

## Exports

[List main exports and their purpose]

## Dependents

- `apps/api` — [how it uses this package]
- `apps/web` / `apps/client-dashboard-web` — [how each uses this package]

## Commands

\`\`\`bash
make typecheck PKG=@repo/<package>
make test PKG=@repo/<package>
\`\`\`
```

## Step 6: Verify Turbo pipeline

Check `turbo.json` at the root — verify `typecheck`, `test`, and `build` pipeline tasks cover `packages/*`. They should already since Turbo globs all workspaces. No change needed unless the package requires a custom pipeline task.

## Step 7: Verify setup

```bash
make typecheck PKG=@repo/<package>
```

This confirms:
- tsconfig inheritance is correct
- TypeScript compiles without errors
- Turbo can find and run the package

## No TDD phase

Package scaffolding is infrastructure setup. There is no code to test-drive yet. The consuming feature (API module or web feature) will drive the package's actual implementation through TDD.
