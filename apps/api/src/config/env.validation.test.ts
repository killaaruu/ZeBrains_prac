import { describe, expect, it } from "vitest";
import { validateEnv } from "./env.validation";

const baseEnv = {
  DATABASE_URL: "postgresql://user:pass@localhost:5432/app",
};

describe("validateEnv", () => {
  it("should pass with all required variables", () => {
    expect(() => validateEnv(baseEnv)).not.toThrow();
  });

  it("should throw if DATABASE_URL is missing", () => {
    const { DATABASE_URL: _, ...rest } = baseEnv;
    expect(() => validateEnv(rest)).toThrow("DATABASE_URL");
  });

  it("should throw if DATABASE_URL is not a valid postgres URL", () => {
    expect(() => validateEnv({ ...baseEnv, DATABASE_URL: "not-a-url" })).toThrow("DATABASE_URL");
  });

  it("should accept optional PORT as number string", () => {
    const result = validateEnv({ ...baseEnv, PORT: "3111" });
    expect(result.PORT).toBe("3111");
  });

  it("should accept optional SUPABASE_URL", () => {
    const result = validateEnv({ ...baseEnv, SUPABASE_URL: "https://project.supabase.co" });
    expect(result.SUPABASE_URL).toBe("https://project.supabase.co");
  });

  it("should pass through optional variables when absent", () => {
    const result = validateEnv(baseEnv);
    expect(result.SUPABASE_URL).toBeUndefined();
  });

  it("should accept SUPABASE_SECRET_KEY in new sb_secret_ format", () => {
    const result = validateEnv({ ...baseEnv, SUPABASE_SECRET_KEY: "sb_secret_abc123" });
    expect(result.SUPABASE_SECRET_KEY).toBe("sb_secret_abc123");
  });

  it("should reject SUPABASE_SECRET_KEY without sb_secret_ prefix", () => {
    expect(() => validateEnv({ ...baseEnv, SUPABASE_SECRET_KEY: "eyJsegacy.JWT.value" })).toThrow(
      "SUPABASE_SECRET_KEY",
    );
  });

  it("should accept optional REDIS_URL", () => {
    const result = validateEnv({ ...baseEnv, REDIS_URL: "redis://localhost:6379" });
    expect(result.REDIS_URL).toBe("redis://localhost:6379");
  });

  it("should default the LLM model to gpt-4o-mini", () => {
    const result = validateEnv(baseEnv);
    expect(result.LLM_MODEL).toBe("gpt-4o-mini");
  });

  it("should default the LLM base URL to 302.ai", () => {
    const result = validateEnv(baseEnv);
    expect(result.LLM_BASE_URL).toBe("https://api.302.ai/v1");
  });

  it("should accept LLM provider and Tavily agent runtime configuration", () => {
    const result = validateEnv({
      ...baseEnv,
      LLM_API_KEY: "sk-test-key",
      LLM_BASE_URL: "https://custom.api.com/v1",
      LLM_MODEL: "deepseek-chat,claude-3-haiku",
      TAVILY_API_KEY: "tvly-dev-example",
    });

    expect(result.LLM_API_KEY).toBe("sk-test-key");
    expect(result.LLM_BASE_URL).toBe("https://custom.api.com/v1");
    expect(result.LLM_MODEL).toBe("deepseek-chat,claude-3-haiku");
    expect(result.TAVILY_API_KEY).toBe("tvly-dev-example");
  });

  it("should map deprecated LLM_MODEL_POOL to the canonical LLM_MODEL", () => {
    const result = validateEnv({
      ...baseEnv,
      LLM_MODEL_POOL: "qwen2.5:7b,gemma4:12b-it-qat",
    });

    expect(result.LLM_MODEL).toBe("qwen2.5:7b,gemma4:12b-it-qat");
  });

  it("should prefer LLM_MODEL over deprecated LLM_MODEL_POOL", () => {
    const result = validateEnv({
      ...baseEnv,
      LLM_MODEL: "gpt-4o-mini,gpt-4o",
      LLM_MODEL_POOL: "qwen2.5:7b,gemma4:12b-it-qat",
    });

    expect(result.LLM_MODEL).toBe("gpt-4o-mini,gpt-4o");
  });

  it("should reject an empty LLM model", () => {
    expect(() => validateEnv({ ...baseEnv, LLM_MODEL: " , " })).toThrow("LLM_MODEL");
  });

  it("should pass through unknown variables via passthrough", () => {
    const result = validateEnv({ ...baseEnv, RANDOM_VAR: "hello" });
    expect(result.RANDOM_VAR).toBe("hello");
  });
});
