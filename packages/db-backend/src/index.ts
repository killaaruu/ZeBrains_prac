import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import * as schema from "./schema/index";

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) throw new Error("DATABASE_URL is required");

const client = postgres(dbUrl);

export const db = drizzle(client, { schema });

/** Fully-typed Drizzle Postgres client (with schema). Use for DI injection typing. */
export type DrizzleDb = typeof db;

/** Drizzle Postgres client without schema (for raw SQL only). May be null if not configured. */
export type DrizzleReadonlyDb = ReturnType<typeof drizzle> | null;

/**
 * Apply all pending Drizzle migrations from the given folder.
 *
 * Uses a Postgres advisory lock internally, so concurrent calls (e.g. rolling
 * deploy with multiple replicas) are serialized safely — only the first caller
 * runs the SQL; the rest wait and then return immediately once the lock is
 * released.
 *
 * Path resolution (see ADR-002):
 *   - Dev  (Docker Compose): MIGRATIONS_DIR env var → /repo/packages/db-backend/src/migrations
 *   - Prod (Docker image):   MIGRATIONS_DIR env var → /app/migrations
 */
export async function runMigrations(migrationsFolder: string): Promise<void> {
  await migrate(db, { migrationsFolder });
}
