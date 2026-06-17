---
name: verify
description: Run the full project verification pipeline (format, typecheck, test, build)
allowed-tools: Bash
---

# Full Project Verification

Run the complete verification pipeline for the monorepo.

## Steps

1. **Format check + fix** (Biome):

   ```bash
   biome check --write .
   ```

2. **Run every check command in one command:**

   ```bash
   turbo check
   ```

3. **Report results**: Summarize what passed and what failed. For failures, include the error output.

## Targeted Verification

If $ARGUMENTS is provided, run verification only for that package:

```bash
pnpm --filter $ARGUMENTS typecheck
pnpm --filter $ARGUMENTS test
pnpm --filter $ARGUMENTS build
```

Common filter values:

- `@repo/api` — backend
- `@repo/web` — backend
- `@repo/shared` — shared schemas/types
- `@repo/client-core` — shared hooks/stores
- `@repo/db-backend` — database schema

## Self-Verification Protocol

After completing any code change, verify your work before presenting results:

1. **After editing implementation files**: Run `pnpm --filter <package> test` for the affected package
2. **After editing shared packages** (`packages/shared`, `packages/client-core`): Run `turbo typecheck` since changes propagate
3. **After editing schema files** (`packages/db-backend/src/schema/`): Run `pnpm --filter @repo/db-backend generate`
4. **Before committing**: Run `turbo check` for full pipeline validation
5. **After committing**: Run `git status` to confirm clean working tree
6. **After pushing**: Run `gh pr checks` (if PR exists) to monitor CI

### Quick verification by package

| Changed in | Minimum verification |
|---|---|
| `apps/api/` | `pnpm --filter @repo/api test && pnpm --filter @repo/api typecheck` |
| `packages/shared/` | `pnpm --filter @repo/shared test && turbo typecheck` |
| `packages/client-core/` | `pnpm --filter @repo/client-core test && turbo typecheck` |
| `packages/db-backend/src/schema/` | `pnpm --filter @repo/db-backend generate && pnpm --filter @repo/api test` |
