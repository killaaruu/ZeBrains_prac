import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import {
  ensureLocalSupabaseStarted,
  parseEnvFile,
  resolveSupabaseRuntimeEnv,
} from "./supabase-env";

describe("parseEnvFile", () => {
  it("parses dotenv-style key value pairs", () => {
    expect(
      parseEnvFile(`
        # comment
        VITE_SUPABASE_URL="https://example.supabase.co"
        VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_example
      `),
    ).toEqual({
      VITE_SUPABASE_URL: "https://example.supabase.co",
      VITE_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_example",
    });
  });
});

describe("resolveSupabaseRuntimeEnv", () => {
  it("uses one Supabase environment from apps/web/.env and backend-only values from apps/api/.env", async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), "local-env-"));
    await mkdir(join(repoRoot, "apps/web"), { recursive: true });
    await mkdir(join(repoRoot, "apps/api"), { recursive: true });
    await writeFile(
      join(repoRoot, "apps/web/.env"),
      [
        "VITE_SUPABASE_URL=https://example.supabase.co",
        "VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_example",
      ].join("\n"),
    );
    await writeFile(
      join(repoRoot, "apps/api/.env"),
      [
        "SUPABASE_JWT_SECRET=jwt-secret",
        "SUPABASE_SECRET_KEY=service-role-secret",
        "SUPABASE_STORAGE_URL=https://storage.example.supabase.co",
      ].join("\n"),
    );

    await expect(resolveSupabaseRuntimeEnv(repoRoot, {})).resolves.toEqual({
      url: "https://example.supabase.co",
      publishableKey: "sb_publishable_example",
      jwtSecret: "jwt-secret",
      secretKey: "service-role-secret",
      storageUrl: "https://storage.example.supabase.co",
      webhookSecret: undefined,
    });
  });

  it("lets process env override env files", async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), "local-env-"));
    await mkdir(join(repoRoot, "apps/web"), { recursive: true });
    await writeFile(
      join(repoRoot, "apps/web/.env"),
      [
        "VITE_SUPABASE_URL=https://file.supabase.co",
        "VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_file",
      ].join("\n"),
    );

    await expect(
      resolveSupabaseRuntimeEnv(repoRoot, {
        SUPABASE_URL: "https://env.supabase.co",
        SUPABASE_PUBLISHABLE_KEY: "sb_publishable_env",
      }),
    ).resolves.toMatchObject({
      url: "https://env.supabase.co",
      publishableKey: "sb_publishable_env",
    });
  });

  it("uses Supabase CLI local status instead of hosted app env files in local mode", async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), "local-env-"));
    await mkdir(join(repoRoot, "apps/web"), { recursive: true });
    await writeFile(
      join(repoRoot, "apps/web/.env"),
      [
        "VITE_SUPABASE_URL=https://hosted.supabase.co",
        "VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_hosted",
      ].join("\n"),
    );
    const runner = vi.fn().mockResolvedValue({
      stdout: [
        "API_URL=http://127.0.0.1:54321",
        "PUBLISHABLE_KEY=sb_publishable_local",
        "SECRET_KEY=sb_secret_local",
        "JWT_SECRET=local-jwt-secret",
      ].join("\n"),
    });

    await expect(
      resolveSupabaseRuntimeEnv(repoRoot, {}, { preferLocal: true, runner }),
    ).resolves.toEqual({
      url: "http://127.0.0.1:54321",
      publishableKey: "sb_publishable_local",
      secretKey: "sb_secret_local",
      jwtSecret: "local-jwt-secret",
      storageUrl: "http://127.0.0.1:54321",
      webhookSecret: undefined,
    });
    expect(runner).toHaveBeenCalledWith(["status", "-o", "env", "--workdir", repoRoot], repoRoot);
  });

  it("does not auto-start Supabase when status is unavailable", async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), "local-env-"));
    const runner = vi.fn().mockRejectedValue(new Error("No local Supabase"));

    await expect(ensureLocalSupabaseStarted(repoRoot, {}, runner)).resolves.toBeUndefined();
    expect(runner).toHaveBeenCalledTimes(1);
    expect(runner).toHaveBeenCalledWith(["status", "-o", "env", "--workdir", repoRoot], repoRoot);
  });
});
