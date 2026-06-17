---
name: new-drizzle-table
description: Add a new Drizzle ORM table to packages/db-backend
argument-hint: "[table-name]"
---

# Add a new Drizzle table

Create a new database table named `$ARGUMENTS` in `packages/db-backend/src/schema/`.

**TDD discipline:** Invoke `superpowers:test-driven-development`. This skill provides only the layer-specific structure, conventions, and the forced next step.

## Target files

```
packages/db-backend/src/schema/$ARGUMENTS.ts
packages/db-backend/src/schema/index.ts        # re-export
packages/db-backend/src/migrations/<n>_*.sql   # generated, reviewed, committed
```

## Conventions

```ts
import { pgTable, uuid, text, timestamp } from "drizzle-orm/pg-core";

export const $arguments = pgTable("$arguments", {
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

## Tests Codex should write (drives the Red phase)

Service-level tests in the consuming API module (mock Drizzle for the table that doesn't exist yet): insert returns row, select with filters/pagination, select by id (found / not-found), update returns row, soft delete if applicable.

## Forced next step (in order)

1. **Invoke `db-migrate` skill** — generate, review, run the migration.
2. If API needs to be exposed → **invoke `new-api-module`** for the CRUD layer.
3. If the entity flows to clients → **invoke `new-shared-schema`** for the Zod schema, then **`codegen-api`**, then **`new-client-hook`**.
4. Final: `turbo typecheck`.
