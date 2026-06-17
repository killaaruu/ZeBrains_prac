---
name: new-drizzle-table
description: Scaffold a new Drizzle ORM table in packages/db-backend — schema file, barrel re-export, and conventions for UUID PKs, timestamps, FKs, enums, and indexes. Use when adding a new database table or persisting a new domain concept, or when the user asks to "add a table", "create a new table/model/entity", "new Drizzle schema", or "store X in the database". First step of the DB stack chain (→ db-migrate → new-shared-schema → new-api-module).
---

# Add a new Drizzle table

Create a new database table in `packages/db-backend/src/schema/`. Take the table name from the user's request (or the upstream chain step that invoked this skill); below, `<table>` stands for that name — camelCase for the TS export, snake_case for SQL identifiers.

**TDD discipline:** Invoke `superpowers:test-driven-development`. This skill provides only the layer-specific structure, conventions, and the forced next step.

## Target files

```
packages/db-backend/src/schema/<table>.ts
packages/db-backend/src/schema/index.ts        # re-export
packages/db-backend/src/migrations/<n>_*.sql   # generated, reviewed, committed
```

## Conventions

```ts
import { pgTable, uuid, text, timestamp } from "drizzle-orm/pg-core";

export const <table> = pgTable("<table>", {
  id: uuid("id").primaryKey().defaultRandom(),
  // columns driven by tests
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
```

- UUID primary keys: `uuid("id").primaryKey().defaultRandom()`.
- Timestamps with `defaultNow().notNull()` for `created_at` / `updated_at`.
- Foreign keys: `uuid("user_id").references(() => users.id)`.
- Enums: `pgEnum` above the table.
- Add indexes for query patterns the tests reveal.

## Tests Claude should write (drives the Red phase)

Service-level tests in the consuming API module (mock Drizzle for the table that doesn't exist yet): insert returns row, select with filters/pagination, select by id (found / not-found), update returns row, soft delete if applicable.

## Forced next step (in order)

1. **Invoke `db-migrate` skill** — generate, review, run the migration.
2. If the entity is exposed via the API → **invoke `new-shared-schema`** first (author the `@repo/shared` Zod contract — the API has no DTOs and validates against it), then **`new-api-module`** for the CRUD layer.
3. After the module → **invoke `sync-api-contract`** to sync/typecheck the API↔client contract via `@repo/shared`; then, if a frontend will consume it → **`new-client-hook`**.
4. If a new UI surface consumes the hook → **invoke `new-frontend-feature`**.
5. Chain terminal: **invoke the `verify` skill**.
