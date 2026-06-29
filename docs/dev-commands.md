# Dev Commands

Reference guide for the repository command flow. The canonical verification flow
is `/verify`; this file is the human-readable companion.

## Test Runner

Vitest is used across the stack (`api`, `web`, `client-core`, `shared`,
`db-backend`, and related packages). Test files live next to the code:
`foo.ts` -> `foo.test.ts`.

## Commands

All commands go through the root `Makefile`. Run `make help` for the full list.

```bash
# Full validation pipeline
make check

# Worktree-safe local environment
make local
make local-e2e

# Customer demo (local API + worker behind the stable ngrok domain)
make demo
make demo-stop

# Individual commands
make typecheck
make test
make build

# Format + auto-fix
make format

# Format check only
make format-check

# Per-package (PKG=<workspace>)
make test PKG=@repo/api
make typecheck PKG=@repo/api
make test PKG=@repo/shared
make typecheck PKG=@repo/shared
make test PKG=@repo/client-core
make typecheck PKG=@repo/client-core
make typecheck PKG=@repo/services-client

# After a shared Zod schema change
make test PKG=@repo/shared
make typecheck

# After a Drizzle schema change
make db-generate
make db-migrate

# After an API endpoint change
make build PKG=@repo/api
make typecheck PKG=@repo/api
```

## When To Run What

- If you changed `packages/shared/`, run `make typecheck`; it affects the whole repo.
- If you changed `packages/client-core/`, run its tests and typecheck the web app.
- If you changed `packages/services-client/`, run its tests and typecheck the web app.
- If you changed `packages/db-backend/`, run API tests and generate a migration if the schema changed.
- If you changed `apps/api/`, run API tests, typecheck, and rebuild if needed.
- Before commit or PR, run `make check`.

## Local Development

The default local startup path is `make local`. It prepares a worktree-safe local
environment by:

- starting Postgres and Redis via `docker-compose.local.yml`
- selecting free ports for the current worktree
- applying migrations
- starting the API, the report-generation worker, and the web app
- writing generated env/state into `.local-env/`

For TrendScout, the worker is part of the required local stack. If you start
only the API and web app, the UI can submit report jobs, but they remain stuck
in `queued` because no worker is consuming the BullMQ queue.

Use `make local-e2e` for API e2e checks that require local infrastructure. For
custom e2e commands, use `make local-run CMD="<command>"` so you reuse the same
prepared environment.

For UI work, start `make local` and verify behavior in a browser before marking
the task complete.
