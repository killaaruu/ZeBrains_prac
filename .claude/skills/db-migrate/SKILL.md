---
name: db-migrate
description: Generate, review, and run Drizzle ORM (PostgreSQL) migrations after a schema change, then verify API tests still pass. Use after editing a Drizzle schema/table, when the database needs to catch up to the code, or when the user asks to "generate a migration", "run/apply migrations", "migrate the DB", "make db-generate/db-migrate", or "sync the schema". Follows new-drizzle-table in the DB stack chain.
---

# Database Migration

Generate and run Drizzle migrations for the backend (PostgreSQL).

## Backend (PostgreSQL)

1. **Generate migration** from schema changes:
   ```bash
   make db-generate
   ```

2. **Review generated SQL** — read the newest migration file:
   ```bash
   ls -t packages/db-backend/src/migrations/*.sql | head -1
   ```
   Verify the SQL is correct. Check for destructive operations (DROP TABLE, DROP COLUMN).

3. **Run migration:**
   ```bash
   make db-migrate
   ```

4. **Commit the generated migration — MANDATORY, do NOT skip.**
   `make db-generate` writes three artifacts that must be committed *together*:
   the SQL migration, its schema snapshot, and the journal index.
   ```bash
   git add packages/db-backend/src/migrations/*.sql \
           packages/db-backend/src/migrations/meta/*_snapshot.json \
           packages/db-backend/src/migrations/meta/_journal.json
   git commit -m "feat(db): <describe schema change>"
   ```
   > ⚠️ **Skipping this breaks CI.** An uncommitted snapshot / `_journal.json` is
   > the most common `make check` failure: CI re-runs `make db-generate`, sees the
   > schema has no matching snapshot, and produces a phantom "new" migration. Always
   > stage and commit the snapshot + journal alongside the `.sql` file.

5. **Verify API tests still pass:**
   ```bash
   make test PKG=@repo/api
   ```

6. **Report** what tables/columns were created, altered, or dropped.

## Drizzle Studio

To visually inspect the database after migration:
```bash
make db-studio
```

## Forced next step

- Entity is exposed via the API → **invoke `new-shared-schema`** first (author the `@repo/shared` Zod contract the API validates against), then **`new-api-module`** for the CRUD layer.
- Schema-only change with no API surface → chain ends here; run the `verify` skill.
