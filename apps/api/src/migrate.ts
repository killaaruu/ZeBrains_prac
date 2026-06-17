import "dotenv/config";
import { resolve } from "node:path";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

// lock_timeout bounds how long a migration statement waits to ACQUIRE a lock.
// During a PreSync deploy the old pods are still running and may hold locks on
// tables a migration wants to ALTER; without this the migration hangs forever
// (and with it the ArgoCD hook). It does NOT cap how long a statement runs once
// it holds the lock, so legitimately slow migrations are unaffected — they fail
// only when genuinely blocked, with a clear "canceling statement due to lock
// timeout" error in the Job logs.
const client = postgres(dbUrl, {
  max: 1,
  connection: { lock_timeout: 60_000 }, // ms — fail a blocked migration after 60s
});
const db = drizzle(client);

// In Docker: migrations are at /app/migrations (copied by Dockerfile)
// In dev (tsx): migrations are in packages/db-backend/src/migrations
const migrationsFolder = process.env.MIGRATIONS_DIR || resolve(__dirname, "../migrations");

async function main() {
  console.log(`Running migrations from ${migrationsFolder}...`);
  await migrate(db, { migrationsFolder });
  console.log("Migrations applied successfully");

  await client.end();
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
