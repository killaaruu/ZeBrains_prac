import { Logger } from "@nestjs/common";
import { z } from "zod";

const logger = new Logger("EnvValidation");

export const DEFAULT_LLM_BASE_URL = "https://api.302.ai/v1";
export const DEFAULT_LLM_MODEL = "gpt-4o-mini";

const emptyStringToUndefined = (value: unknown) => (value === "" ? undefined : value);
const optionalString = z.preprocess(emptyStringToUndefined, z.string().optional());
const optionalUrl = z.preprocess(emptyStringToUndefined, z.string().url().optional());

const envSchema = z
  .object({
    // Required
    DATABASE_URL: z.string().startsWith("postgresql://", "Must be a PostgreSQL connection URL"),

    // Optional with defaults
    PORT: z.string().optional(),

    // Optional — Supabase Auth (JWKS verification; HMAC fallback)
    SUPABASE_URL: optionalUrl,
    SUPABASE_JWT_SECRET: optionalString,
    SUPABASE_WEBHOOK_SECRET: optionalString,

    // Optional — Supabase Storage.
    // Uses the publishable/secret key pair, see
    // https://supabase.com/docs/guides/getting-started/api-keys.
    SUPABASE_STORAGE_URL: optionalUrl,
    SUPABASE_PUBLISHABLE_KEY: z.preprocess(
      emptyStringToUndefined,
      z
        .string()
        .regex(/^sb_publishable_/, "Must start with sb_publishable_")
        .optional(),
    ),
    SUPABASE_SECRET_KEY: z.preprocess(
      emptyStringToUndefined,
      z
        .string()
        .regex(/^sb_secret_/, "Must start with sb_secret_")
        .optional(),
    ),

    // Optional — Redis (BullMQ task queue)
    REDIS_URL: optionalUrl,

    // Optional - Agent runtime (TrendScout)
    LLM_API_KEY: optionalString,
    LLM_BASE_URL: z.preprocess(
      emptyStringToUndefined,
      z.string().url().default(DEFAULT_LLM_BASE_URL),
    ),
    LLM_MODEL: z.preprocess(
      emptyStringToUndefined,
      z
        .string()
        .default(DEFAULT_LLM_MODEL)
        .refine(
          (value) => value.split(",").every((model) => model.trim().length > 0),
          "Must be a comma-separated list of model names",
        ),
    ),
    TAVILY_API_KEY: optionalString,
    // Multiplier on per-node LLM timeouts. >1 for slow local GPUs (e.g. 6 GB
    // laptops) so cold-start inference does not trip false "timed out" errors.
    LLM_NODE_TIMEOUT_SCALE: z.preprocess(
      emptyStringToUndefined,
      z.coerce.number().positive().default(1),
    ),

    // Optional — Read replica
    DATABASE_READONLY_URL: optionalString,

    // Optional — build metadata
    GIT_SHA: optionalString,
    GIT_BRANCH: optionalString,
  })
  .passthrough();

export type EnvConfig = z.infer<typeof envSchema>;

function normalizeEnvAliases(config: Record<string, unknown>): Record<string, unknown> {
  if (config.LLM_MODEL !== undefined) {
    return config;
  }

  if (typeof config.LLM_MODEL_POOL !== "string") {
    return config;
  }

  return {
    ...config,
    LLM_MODEL: config.LLM_MODEL_POOL,
  };
}

export function validateEnv(config: Record<string, unknown>): EnvConfig {
  const normalizedConfig = normalizeEnvAliases(config);
  const result = envSchema.safeParse(normalizedConfig);

  if (!result.success) {
    const errors = result.error.issues
      .map((issue) => `  ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(`Environment validation failed:\n${errors}`);
  }

  logger.log("Environment variables validated successfully");
  return result.data;
}
