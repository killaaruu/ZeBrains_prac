# packages/db-backend — Drizzle Postgres

## Schema Change Workflow

Use the `db-migrate` skill — it runs the full chain: edit `src/schema/` → `generate` → review SQL in `src/migrations/` → `migrate` → validate with API tests.

## TDD (Mandatory)

Test-first, Red → Green → Refactor — see root `CLAUDE.md`. Schema changes must be validated by running API tests: `pnpm --filter @repo/api test`.

## Conventions

- One file per table in `src/schema/`
- Re-export all tables from `src/schema/index.ts`
- Use `pgTable` from `drizzle-orm/pg-core`
- UUID primary keys: `uuid("id").primaryKey().defaultRandom()`
- Timestamps: `timestamp("created_at").defaultNow()`, `timestamp("updated_at").defaultNow()`
