---
name: new-package
description: Scaffold a new packages/X workspace package with correct tsconfig, pnpm workspace conventions, and Turbo pipeline registration
argument-hint: "[package-name]"
---

# Create a new workspace package

Scaffold a new package named `$ARGUMENTS` at `packages/$ARGUMENTS/` with correct monorepo conventions.

Reference `packages/client-core/package.json` and `packages/client-core/tsconfig.json` as the templates to follow.

## Target structure

```
packages/$ARGUMENTS/
├── package.json      # @repo/$ARGUMENTS, correct scripts and workspace deps
├── tsconfig.json     # extends @repo/config/tsconfig.base.json, composite: true
├── src/
│   └── index.ts      # Barrel export stub
└── AGENTS.md         # Package purpose, exports, dependents, commands
```

## Step 1: Read existing packages for conventions

Before creating files, read:
- `packages/client-core/package.json` — for script names, peer deps pattern
- `packages/client-core/tsconfig.json` — for tsconfig inheritance pattern
- `pnpm-workspace.yaml` (root) — verify `packages/*` is included (it should be)

## Step 2: Create `package.json`

```json
{
  "name": "@repo/$ARGUMENTS",
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
// @repo/$ARGUMENTS — [describe package purpose here]
// Add exports as the package grows.
```

## Step 5: Create `AGENTS.md`

Document the package so agents know when and how to use it:

```markdown
# @repo/$ARGUMENTS

## Purpose

[Describe what this package provides and why it exists as a separate package]

## Exports

[List main exports and their purpose]

## Dependents

- `apps/api` — [how it uses this package]
- `apps/web` / `apps/client-dashboard-web` — [how each uses this package]

## Commands

\`\`\`bash
pnpm --filter @repo/$ARGUMENTS typecheck
pnpm --filter @repo/$ARGUMENTS test
\`\`\`
```

## Step 6: Verify Turbo pipeline

Check `turbo.json` at the root — verify `typecheck`, `test`, and `build` pipeline tasks cover `packages/*`. They should already since Turbo globs all workspaces. No change needed unless the package requires a custom pipeline task.

## Step 7: Verify setup

```bash
turbo typecheck --filter @repo/$ARGUMENTS
```

This confirms:
- tsconfig inheritance is correct
- TypeScript compiles without errors
- Turbo can find and run the package

## No TDD phase

Package scaffolding is infrastructure setup. There is no code to test-drive yet. The consuming feature (API module or web feature) will drive the package's actual implementation through TDD.
