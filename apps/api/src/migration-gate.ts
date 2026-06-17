/**
 * Decide whether the API should skip its startup DB migrations.
 *
 * Default is `false` — dev, prod, and the full `make local` environment all run
 * migrations on boot as before. Set `API_SKIP_MIGRATIONS=true` only when the API
 * points at a shared/managed database it must never auto-migrate (e.g. the
 * `make local-light` mode against the cloud DB from `apps/api/.env`).
 */
export function shouldSkipStartupMigrations(env: NodeJS.ProcessEnv): boolean {
  return env.API_SKIP_MIGRATIONS === "true";
}
