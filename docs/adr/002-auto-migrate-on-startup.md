# ADR-002: Run Database Migrations Automatically on API Startup

**Date:** 2026-03-25
**Status:** Accepted
**Deciders:** @maxmrtnv

## Context

Previously, migrations had to be applied manually (`pnpm --filter @repo/db-backend migrate`
or via `docker-entrypoint.sh` running `node dist/migrate.js` as a separate process before
starting the API). This caused a gap in the dev workflow: a fresh `dev-start` would spin up
the API against an outdated schema, producing 500 errors until migrations were run by hand.

The production Dockerfile already serialized migration then start via `docker-entrypoint.sh`,
but this mechanism was absent in development (Docker Compose watch mode).

## Decision

Run `runMigrations()` inside `bootstrap()`, before `app.listen()`, so the API never accepts
traffic against a stale schema.

```
bootstrap()
  ├── runMigrations(migrationsFolder)   ← new: runs before the server binds
  └── app.listen(port)
```

`runMigrations` is exported from `@repo/db-backend` and delegates to Drizzle's built-in
`migrate()`, which acquires a Postgres advisory lock before applying SQL files.

## Migration folder path resolution

The webpack bundle sets `__dirname` to the compiled output dir, not the source tree.
Rather than computing a relative path from `__dirname`, the folder is provided via an
environment variable `MIGRATIONS_DIR` that is set explicitly per environment:

| Environment | Value | Set by |
|-------------|-------|--------|
| Dev (Docker Compose) | `/repo/packages/db-backend/src/migrations` | `docker-compose.yml` |
| Prod (Docker image) | `/app/migrations` | `Dockerfile` `ENV` |

Fallback: `resolve(__dirname, "../migrations")` — matches the prod Docker layout where
migrations are `COPY`-ed to `/app/migrations` (i.e. one level up from `/app/dist/`).

## Consequences

### Positive

- `dev-start` always produces a fully migrated database — no manual step required
- Impossible to deploy the API against an outdated schema (startup fails loudly instead)
- Single source of truth: one code path for both dev and prod

### Negative

- API startup is slightly slower while the migration check runs (negligible: Drizzle
  compares hashes against `drizzle.__drizzle_migrations` with a single query when
  there is nothing to apply)

### Neutral

- `migrate.js` is kept in the Docker image for standalone manual use
  (`docker run <image> node dist/migrate.js`); `docker-entrypoint.sh` is removed
  since bootstrap owns the migration step and the Dockerfile uses `CMD` directly
- If the project ever moves to rolling deployments with multiple replicas, Drizzle's
  advisory lock (`pg_advisory_lock`) serializes concurrent migration attempts safely —
  no schema corruption risk, though startup latency will be slightly higher for the
  replicas that wait on the lock

## Files changed

| File | Change |
|------|--------|
| `packages/db-backend/src/index.ts` | Export `runMigrations(migrationsFolder)` |
| `apps/api/src/bootstrap.ts` | Call `runMigrations` before `app.listen` |
| `docker-compose.yml` | Add `MIGRATIONS_DIR` env var for dev containers |
| `apps/api/Dockerfile` | Add `ENV MIGRATIONS_DIR=/app/migrations`; switch from entrypoint script to `CMD` |
| `apps/api/docker-entrypoint.sh` | Removed — no longer needed; `CMD` runs `node dist/main.js` directly |
