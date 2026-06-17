import { resolve } from "node:path";

export type RuntimeEnvInput = {
  apiPort: number;
  webPort: number;
  postgresPort: number;
  redisPort: number;
  rootDir: string;
  supabase?: SupabaseRuntimeEnv;
  hostEnv?: NodeJS.ProcessEnv | Record<string, string | undefined>;
};

export type RuntimeEnv = {
  api: Record<string, string>;
  web: Record<string, string>;
  compose: Record<string, string>;
};

export type SupabaseRuntimeEnv = {
  url?: string;
  publishableKey?: string;
  jwtSecret?: string;
  secretKey?: string;
  storageUrl?: string;
  webhookSecret?: string;
};

const PLACEHOLDER_SUPABASE_URL = "https://local-dev-placeholder.supabase.co";
const DEFAULT_OLLAMA_BASE_URL = "http://localhost:11434";
const DEFAULT_LLM_MODEL_POOL = "qwen2.5:7b,gemma4:12b-it-qat";

function definedEntries(values: Record<string, string | undefined>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(values).filter((entry): entry is [string, string] => Boolean(entry[1])),
  );
}

export function buildRuntimeEnv(input: RuntimeEnvInput): RuntimeEnv {
  const apiUrl = `http://127.0.0.1:${input.apiPort}`;
  const databaseUrl = `postgresql://app:app@127.0.0.1:${input.postgresPort}/app_local`;
  const redisUrl = `redis://127.0.0.1:${input.redisPort}`;
  const hostEnv = input.hostEnv ?? process.env;
  const supabase = input.supabase ?? {};
  const supabaseUrl =
    supabase.url ??
    hostEnv.LOCAL_DEV_SUPABASE_URL ??
    hostEnv.VITE_SUPABASE_URL ??
    hostEnv.SUPABASE_URL ??
    PLACEHOLDER_SUPABASE_URL;
  const supabasePublishableKey =
    supabase.publishableKey ??
    hostEnv.LOCAL_DEV_SUPABASE_PUBLISHABLE_KEY ??
    hostEnv.VITE_SUPABASE_PUBLISHABLE_KEY ??
    "sb_publishable_local_dev_placeholder";
  const supabaseServiceRoleKey =
    supabase.secretKey ??
    hostEnv.LOCAL_DEV_SUPABASE_SERVICE_ROLE_KEY ??
    hostEnv.SUPABASE_SECRET_KEY ??
    hostEnv.SUPABASE_SERVICE_ROLE_KEY ??
    "";
  const adminEmail = hostEnv.LOCAL_DEV_ADMIN_EMAIL ?? "admin@example.com";
  const adminPassword = hostEnv.LOCAL_DEV_ADMIN_PASSWORD ?? "LocalAdmin123!";
  const localDevAdminAuthUid =
    hostEnv.LOCAL_DEV_ADMIN_AUTH_UID ?? "00000000-0000-4000-8000-000000000001";
  const localDevJwtSecret =
    supabase.jwtSecret ?? hostEnv.SUPABASE_JWT_SECRET ?? "local-dev-supabase-jwt-secret-local-dev";
  // With no real Supabase, the web logs in via /auth/local-dev-login (HMAC JWT)
  // and the API accepts it — so the app is usable locally without Supabase.
  const useLocalDevAuth = supabaseUrl === PLACEHOLDER_SUPABASE_URL;
  const apiSupabaseEnv = definedEntries({
    SUPABASE_URL: supabaseUrl,
    SUPABASE_PUBLISHABLE_KEY: supabasePublishableKey,
    SUPABASE_JWT_SECRET: localDevJwtSecret,
    SUPABASE_SECRET_KEY: supabaseServiceRoleKey,
    SUPABASE_STORAGE_URL: supabase.storageUrl,
    SUPABASE_WEBHOOK_SECRET: supabase.webhookSecret,
  });
  const agentRuntimeEnv = definedEntries({
    OLLAMA_BASE_URL: hostEnv.OLLAMA_BASE_URL ?? DEFAULT_OLLAMA_BASE_URL,
    LLM_MODEL_POOL: hostEnv.LLM_MODEL_POOL ?? DEFAULT_LLM_MODEL_POOL,
    TAVILY_API_KEY: hostEnv.TAVILY_API_KEY,
  });
  const clientSupabaseEnv = definedEntries({
    VITE_SUPABASE_URL: supabaseUrl,
    VITE_SUPABASE_PUBLISHABLE_KEY: supabasePublishableKey,
  });

  return {
    api: {
      DATABASE_URL: databaseUrl,
      DATABASE_READONLY_URL: "",
      MIGRATIONS_DIR: resolve(input.rootDir, "packages/db-backend/src/migrations"),
      PORT: String(input.apiPort),
      REDIS_URL: redisUrl,
      LOCAL_DEV_AUTH_ENABLED: useLocalDevAuth ? "true" : "false",
      LOCAL_DEV_ADMIN_EMAIL: adminEmail,
      LOCAL_DEV_ADMIN_PASSWORD: adminPassword,
      LOCAL_DEV_ADMIN_AUTH_UID: localDevAdminAuthUid,
      ...apiSupabaseEnv,
      ...agentRuntimeEnv,
    },
    web: {
      VITE_API_URL: apiUrl,
      VITE_WEB_PORT: String(input.webPort),
      VITE_ALLOWED_RETURN_ORIGINS: `http://127.0.0.1:${input.webPort}`,
      VITE_LOCAL_DEV_AUTH_ENABLED: useLocalDevAuth ? "true" : "false",
      ...clientSupabaseEnv,
    },
    compose: {
      POSTGRES_PORT: String(input.postgresPort),
      REDIS_PORT: String(input.redisPort),
    },
  };
}

export type LightRuntimeEnvInput = {
  apiPort: number;
  webPort: number;
  redisPort: number;
  apiDotEnv: Record<string, string>;
};

export function buildLightRuntimeEnv(input: LightRuntimeEnvInput): RuntimeEnv {
  const apiUrl = `http://127.0.0.1:${input.apiPort}`;

  const api: Record<string, string> = {
    ...input.apiDotEnv,
    PORT: String(input.apiPort),
    REDIS_URL: `redis://127.0.0.1:${input.redisPort}`,
    // The cloud DB from apps/api/.env is shared and already migrated — never let
    // the API auto-migrate it on boot (see apps/api migration-gate).
    API_SKIP_MIGRATIONS: "true",
  };

  const web: Record<string, string> = {
    VITE_API_URL: apiUrl,
    VITE_WEB_PORT: String(input.webPort),
    VITE_ALLOWED_RETURN_ORIGINS: `http://127.0.0.1:${input.webPort}`,
    VITE_LOCAL_DEV_AUTH_ENABLED: "false",
    ...definedEntries({
      VITE_SUPABASE_URL: input.apiDotEnv.SUPABASE_URL,
      VITE_SUPABASE_PUBLISHABLE_KEY: input.apiDotEnv.SUPABASE_PUBLISHABLE_KEY,
    }),
  };

  return {
    api,
    web,
    compose: { REDIS_PORT: String(input.redisPort) },
  };
}

export function mergeEnv(
  base: NodeJS.ProcessEnv,
  values: Record<string, string>,
): NodeJS.ProcessEnv {
  return { ...base, ...values };
}
