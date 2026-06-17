---
name: db-migrate
description: Generate and run Drizzle ORM database migrations after schema changes
---

# Database Migration

Generate and run Drizzle migrations for the backend (PostgreSQL).

## Backend (PostgreSQL)

1. **Generate migration** from schema changes:
   ```bash
   pnpm --filter @repo/db-backend generate
   ```

2. **Review generated SQL** — read the newest migration file:
   ```bash
   ls -t packages/db-backend/src/migrations/*.sql | head -1
   ```
   Verify the SQL is correct. Check for destructive operations (DROP TABLE, DROP COLUMN).

3. **Run migration:**
   ```bash
   pnpm --filter @repo/db-backend migrate
   ```

4. **Verify API tests still pass:**
   ```bash
   pnpm --filter @repo/api test
   ```

5. **Report** what tables/columns were created, altered, or dropped.

## Drizzle Studio

To visually inspect the database after migration:
```bash
pnpm --filter @repo/db-backend studio
```
