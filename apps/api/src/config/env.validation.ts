import { Logger } from "@nestjs/common";
import { z } from "zod";

const logger = new Logger("EnvValidation");

const envSchema = z
  .object({
    // Required
    DATABASE_URL: z.string().startsWith("postgresql://", "Must be a PostgreSQL connection URL"),

    // Optional with defaults
    PORT: z.string().optional(),

    // Optional — Supabase Auth (JWKS verification; HMAC fallback)
    SUPABASE_URL: z.string().url().optional(),
    SUPABASE_JWT_SECRET: z.string().optional(),
    SUPABASE_WEBHOOK_SECRET: z.string().optional(),

    // Optional — Supabase Storage.
    // Uses the publishable/secret key pair, see
    // https://supabase.com/docs/guides/getting-started/api-keys.
    SUPABASE_STORAGE_URL: z.string().url().optional(),
    SUPABASE_PUBLISHABLE_KEY: z
      .string()
      .regex(/^(sb_publishable_|$)/, "Must start with sb_publishable_")
      .optional(),
    SUPABASE_SECRET_KEY: z
      .string()
      .regex(/^(sb_secret_|$)/, "Must start with sb_secret_")
      .optional(),

    // Optional — Redis (BullMQ task queue)
    REDIS_URL: z.string().url().optional(),

    // Optional — Read replica
    DATABASE_READONLY_URL: z.string().optional(),

    // Optional — build metadata
    GIT_SHA: z.string().optional(),
    GIT_BRANCH: z.string().optional(),
  })
  .passthrough();

export type EnvConfig = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): EnvConfig {
  const result = envSchema.safeParse(config);

  if (!result.success) {
    const errors = result.error.issues
      .map((issue) => `  ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(`Environment validation failed:\n${errors}`);
  }

  logger.log("Environment variables validated successfully");
  return result.data;
}
