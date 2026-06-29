import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { buildLightRuntimeEnv, buildRuntimeEnv } from "./env";

function makeRuntimeInput(overrides: Partial<Parameters<typeof buildRuntimeEnv>[0]> = {}) {
  return {
    apiPort: 4011,
    webPort: 4173,
    postgresPort: 45432,
    redisPort: 46380,
    rootDir: "/repo",
    ...overrides,
  };
}

describe("buildRuntimeEnv", () => {
  it("builds consistent API and web environment values", () => {
    const env = buildRuntimeEnv(makeRuntimeInput());

    expect(env.api.PORT).toBe("4011");
    expect(env.api.DATABASE_URL).toBe("postgresql://app:app@127.0.0.1:45432/app_local");
    expect(env.api.MIGRATIONS_DIR).toBe(resolve("/repo", "packages/db-backend/src/migrations"));
    expect(env.api.REDIS_URL).toBe("redis://127.0.0.1:46380");
    expect(env.api.LOCAL_DEV_AUTH_ENABLED).toBe("true");
    expect(env.api.LOCAL_DEV_ADMIN_AUTH_UID).toBe("00000000-0000-4000-8000-000000000001");
    expect(env.api.SUPABASE_JWT_SECRET).toBe("local-dev-supabase-jwt-secret-local-dev");
    expect(env.api.SUPABASE_URL).toBe("https://local-dev-placeholder.supabase.co");
    expect(env.web.VITE_API_URL).toBe("http://127.0.0.1:4011");
    expect(env.web.VITE_WEB_PORT).toBe("4173");
    expect(env.web.VITE_SUPABASE_URL).toBe("https://local-dev-placeholder.supabase.co");
    expect(env.web.VITE_SUPABASE_PUBLISHABLE_KEY).toBe("sb_publishable_local_dev_placeholder");
    // No real Supabase → local-dev auth bypass is enabled for API + worker + web flows.
    expect(env.api.LOCAL_DEV_AUTH_ENABLED).toBe("true");
    expect(env.web.VITE_LOCAL_DEV_AUTH_ENABLED).toBe("true");
    expect(env.compose.POSTGRES_PORT).toBe("45432");
    expect(env.compose.REDIS_PORT).toBe("46380");
  });

  it("uses one explicit Supabase environment for API and web", () => {
    const env = buildRuntimeEnv(
      makeRuntimeInput({
        supabase: {
          url: "https://example.supabase.co",
          publishableKey: "sb_publishable_example",
          jwtSecret: "jwt-secret",
          secretKey: "sb_secret_example",
        },
      }),
    );

    expect(env.api.SUPABASE_URL).toBe("https://example.supabase.co");
    expect(env.api.SUPABASE_PUBLISHABLE_KEY).toBe("sb_publishable_example");
    expect(env.api.SUPABASE_SECRET_KEY).toBe("sb_secret_example");
    expect(env.api.SUPABASE_JWT_SECRET).toBe("jwt-secret");
    expect(env.web.VITE_SUPABASE_URL).toBe("https://example.supabase.co");
    expect(env.web.VITE_SUPABASE_PUBLISHABLE_KEY).toBe("sb_publishable_example");
    // Real Supabase provided → local-dev auth bypass is disabled.
    expect(env.api.LOCAL_DEV_AUTH_ENABLED).toBe("false");
    expect(env.web.VITE_LOCAL_DEV_AUTH_ENABLED).toBe("false");
  });

  it("uses real Supabase local-dev credentials when provided by the host environment", () => {
    const env = buildRuntimeEnv(
      makeRuntimeInput({
        hostEnv: {
          LOCAL_DEV_SUPABASE_URL: "https://project.supabase.co",
          LOCAL_DEV_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_real",
          LOCAL_DEV_SUPABASE_SERVICE_ROLE_KEY: "sb_secret_real",
          LOCAL_DEV_ADMIN_EMAIL: "admin@example.com",
          LOCAL_DEV_ADMIN_PASSWORD: "Password123!",
        },
      }),
    );

    expect(env.api.SUPABASE_URL).toBe("https://project.supabase.co");
    expect(env.api.SUPABASE_SECRET_KEY).toBe("sb_secret_real");
    expect(env.api.LOCAL_DEV_ADMIN_EMAIL).toBe("admin@example.com");
    expect(env.api.LOCAL_DEV_ADMIN_PASSWORD).toBe("Password123!");
    expect(env.web.VITE_SUPABASE_URL).toBe("https://project.supabase.co");
    expect(env.web.VITE_SUPABASE_PUBLISHABLE_KEY).toBe("sb_publishable_real");
  });

  it("wires TrendScout agent runtime defaults into the API environment", () => {
    const env = buildRuntimeEnv(makeRuntimeInput());

    expect(env.api.LLM_BASE_URL).toBe("https://api.302.ai/v1");
    expect(env.api.LLM_MODEL).toBe("gpt-4o-mini");
    expect(env.api.TAVILY_API_KEY).toBeUndefined();
  });

  it("lets host environment override TrendScout agent runtime values", () => {
    const env = buildRuntimeEnv(
      makeRuntimeInput({
        hostEnv: {
          LLM_BASE_URL: "https://custom.api.com/v1",
          LLM_API_KEY: "sk-custom-key",
          LLM_MODEL: "deepseek-chat",
          TAVILY_API_KEY: "tvly-local-dev",
        },
      }),
    );

    expect(env.api.LLM_BASE_URL).toBe("https://custom.api.com/v1");
    expect(env.api.LLM_API_KEY).toBe("sk-custom-key");
    expect(env.api.LLM_MODEL).toBe("deepseek-chat");
    expect(env.api.TAVILY_API_KEY).toBe("tvly-local-dev");
  });
});

describe("buildLightRuntimeEnv", () => {
  const apiDotEnv = {
    DATABASE_URL: "postgresql://postgres.cloud:secret@pooler.supabase.com:5432/postgres",
    SUPABASE_URL: "https://project.supabase.co",
    SUPABASE_PUBLISHABLE_KEY: "sb_publishable_cloud",
    SUPABASE_SECRET_KEY: "sb_secret_cloud",
    PORT: "3111",
    REDIS_URL: "redis://localhost:6380",
  };

  it("spreads apps/api/.env into the API env, overriding only PORT and REDIS_URL", () => {
    const env = buildLightRuntimeEnv({ apiPort: 4011, webPort: 4173, redisPort: 46380, apiDotEnv });

    expect(env.api.DATABASE_URL).toBe(
      "postgresql://postgres.cloud:secret@pooler.supabase.com:5432/postgres",
    );
    expect(env.api.SUPABASE_URL).toBe("https://project.supabase.co");
    expect(env.api.SUPABASE_SECRET_KEY).toBe("sb_secret_cloud");
    expect(env.api.PORT).toBe("4011");
    expect(env.api.REDIS_URL).toBe("redis://127.0.0.1:46380");
    expect(env.api.API_SKIP_MIGRATIONS).toBe("true");
  });

  it("derives the web Vite env from the cloud Supabase config with dev-login disabled", () => {
    const env = buildLightRuntimeEnv({ apiPort: 4011, webPort: 4173, redisPort: 46380, apiDotEnv });

    expect(env.web.VITE_API_URL).toBe("http://127.0.0.1:4011");
    expect(env.web.VITE_WEB_PORT).toBe("4173");
    expect(env.web.VITE_ALLOWED_RETURN_ORIGINS).toBe("http://127.0.0.1:4173");
    expect(env.web.VITE_LOCAL_DEV_AUTH_ENABLED).toBe("false");
    expect(env.web.VITE_SUPABASE_URL).toBe("https://project.supabase.co");
    expect(env.web.VITE_SUPABASE_PUBLISHABLE_KEY).toBe("sb_publishable_cloud");
  });

  it("starts redis only and never injects local placeholder Supabase values", () => {
    const env = buildLightRuntimeEnv({
      apiPort: 4011,
      webPort: 4173,
      redisPort: 46380,
      apiDotEnv: {
        SUPABASE_URL: "https://project.supabase.co",
        SUPABASE_PUBLISHABLE_KEY: "sb_pub",
      },
    });

    expect(env.compose).toEqual({ REDIS_PORT: "46380" });
    expect(env.api.DATABASE_URL).toBeUndefined();
    expect(env.web.VITE_SUPABASE_URL).not.toBe("https://local-dev-placeholder.supabase.co");
  });
});
