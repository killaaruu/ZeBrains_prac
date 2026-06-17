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
   make format
   ```

2. **Run every check command in one command:**

   ```bash
   make check
   ```

3. **Report results**: Summarize what passed and what failed. For failures, include the error output.

## Targeted Verification

If the user named a specific package, run verification only for that package (`<package>` below is that filter value, e.g. `@repo/api`):

```bash
make typecheck PKG=<package>
make test PKG=<package>
make build PKG=<package>
```

Common filter values:

- `@repo/api` — backend
- `@repo/web` — backend
- `@repo/shared` — shared schemas/types
- `@repo/client-core` — shared hooks/stores
- `@repo/db-backend` — database schema

## Self-Verification Protocol

After completing any code change, verify your work before presenting results:

1. **After editing implementation files**: Run `make test PKG=<package>` for the affected package
2. **After editing shared packages** (`packages/shared`, `packages/client-core`): Run `make typecheck` since changes propagate
3. **After editing schema files** (`packages/db-backend/src/schema/`): Run `make db-generate`
4. **Before committing**: Run `make check` for full pipeline validation
5. **After committing**: Run `git status` to confirm clean working tree
6. **After pushing**: Run `gh pr checks` (if PR exists) to monitor CI

### Quick verification by package

| Changed in | Minimum verification |
|---|---|
| `apps/api/` | `make test PKG=@repo/api && make typecheck PKG=@repo/api` |
| `packages/shared/` | `make test PKG=@repo/shared && make typecheck` |
| `packages/client-core/` | `make test PKG=@repo/client-core && make typecheck` |
| `packages/db-backend/src/schema/` | `make db-generate && make test PKG=@repo/api` |
