import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";
import type { SupabaseRuntimeEnv } from "./env";

const execFileAsync = promisify(execFile);

export type SupabaseCommandRunner = (
  args: string[],
  repoRoot: string,
) => Promise<{ stdout: string }>;

export type ResolveSupabaseRuntimeEnvOptions = {
  preferLocal?: boolean;
  runner?: SupabaseCommandRunner;
};

export function parseEnvFile(source: string): Record<string, string> {
  const values: Record<string, string> = {};

  for (const rawLine of source.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const separatorIndex = line.indexOf("=");
    if (separatorIndex === -1) continue;

    const key = line.slice(0, separatorIndex).trim();
    const rawValue = line.slice(separatorIndex + 1).trim();
    if (!key) continue;

    values[key] = stripQuotes(rawValue);
  }

  return values;
}

export async function resolveSupabaseRuntimeEnv(
  repoRoot: string,
  baseEnv: NodeJS.ProcessEnv = process.env,
  options: ResolveSupabaseRuntimeEnvOptions = {},
): Promise<SupabaseRuntimeEnv> {
  if (options.preferLocal) {
    const local = await resolveLocalSupabaseRuntimeEnv(repoRoot, options.runner ?? runSupabase);
    if (local.url && local.publishableKey) return local;
  }

  const [webEnv, apiEnv] = await Promise.all([
    readOptionalEnvFile(join(repoRoot, "apps/web/.env")),
    readOptionalEnvFile(join(repoRoot, "apps/api/.env")),
  ]);

  return {
    url: firstDefined(baseEnv.SUPABASE_URL, baseEnv.VITE_SUPABASE_URL, webEnv.VITE_SUPABASE_URL),
    publishableKey: firstDefined(
      baseEnv.SUPABASE_PUBLISHABLE_KEY,
      baseEnv.VITE_SUPABASE_PUBLISHABLE_KEY,
      webEnv.VITE_SUPABASE_PUBLISHABLE_KEY,
    ),
    jwtSecret: firstDefined(baseEnv.SUPABASE_JWT_SECRET, apiEnv.SUPABASE_JWT_SECRET),
    secretKey: firstDefined(baseEnv.SUPABASE_SECRET_KEY, apiEnv.SUPABASE_SECRET_KEY),
    storageUrl: firstDefined(baseEnv.SUPABASE_STORAGE_URL, apiEnv.SUPABASE_STORAGE_URL),
    webhookSecret: firstDefined(baseEnv.SUPABASE_WEBHOOK_SECRET, apiEnv.SUPABASE_WEBHOOK_SECRET),
  };
}

export async function ensureLocalSupabaseStarted(
  repoRoot: string,
  _baseEnv: NodeJS.ProcessEnv = process.env,
  runner: SupabaseCommandRunner = runSupabase,
): Promise<void> {
  // Best-effort: detect a running local Supabase so its credentials can be picked
  // up by resolveSupabaseRuntimeEnv. We deliberately do NOT auto-start Supabase —
  // the template runs with the LOCAL_DEV_AUTH bypass + placeholder Supabase when it
  // is absent, so `local:dev` boots without the Supabase CLI or its container stack.
  try {
    await runner(["status", "-o", "env", "--workdir", repoRoot], repoRoot);
  } catch {
    // Supabase not running / CLI absent — continue with the dev-auth bypass.
  }
}

async function resolveLocalSupabaseRuntimeEnv(
  repoRoot: string,
  runner: SupabaseCommandRunner,
): Promise<SupabaseRuntimeEnv> {
  try {
    const { stdout } = await runner(["status", "-o", "env", "--workdir", repoRoot], repoRoot);
    const values = parseEnvFile(stdout);
    const url = firstDefined(values.API_URL, values.SUPABASE_URL);
    return {
      url,
      publishableKey: firstDefined(values.PUBLISHABLE_KEY, values.ANON_KEY),
      secretKey: firstDefined(values.SECRET_KEY, values.SERVICE_ROLE_KEY),
      jwtSecret: values.JWT_SECRET,
      storageUrl: url,
      webhookSecret: undefined,
    };
  } catch {
    return {};
  }
}

async function runSupabase(args: string[], repoRoot: string): Promise<{ stdout: string }> {
  const { stdout } = await execFileAsync("supabase", args, {
    cwd: repoRoot,
    env: process.env,
    maxBuffer: 1024 * 1024 * 4,
  });
  return { stdout };
}

async function readOptionalEnvFile(path: string): Promise<Record<string, string>> {
  try {
    return parseEnvFile(await readFile(path, "utf8"));
  } catch (error) {
    if ((error as { code?: string }).code === "ENOENT") return {};
    throw error;
  }
}

function firstDefined(...values: Array<string | undefined>): string | undefined {
  return values.find((value) => value !== undefined && value.trim().length > 0);
}

function stripQuotes(value: string): string {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  return value;
}
