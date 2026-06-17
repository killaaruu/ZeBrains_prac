import { seedLocalAdminUser } from "./admin-seed";
import type { RuntimeEnv } from "./env";
import { type ManagedProcess, runCommand, startManagedProcess, waitForHttp } from "./processes";

export type EnvironmentConfig = {
  repoRoot: string;
  projectName: string;
  runtimeEnv: RuntimeEnv;
  e2eCommand: string[];
};

export type EnvironmentDriver = {
  composeUp: (config: EnvironmentConfig, services?: string[]) => Promise<void>;
  runMigrations: (config: EnvironmentConfig) => Promise<void>;
  seedAdmin: (config: EnvironmentConfig) => Promise<void>;
  startApi: (config: EnvironmentConfig) => Promise<ManagedProcess>;
  runCommand: (command: string[], config: EnvironmentConfig) => Promise<void>;
  composeDown: (config: EnvironmentConfig) => Promise<void>;
};

export const defaultDriver: EnvironmentDriver = {
  composeUp: async (config, services) => {
    await runCommand(buildComposeUpCommand(config.projectName, services), {
      cwd: config.repoRoot,
      env: config.runtimeEnv.compose,
    });
  },
  runMigrations: async (config) => {
    await runCommand(["pnpm", "--filter", "@repo/db-backend", "migrate"], {
      cwd: config.repoRoot,
      env: config.runtimeEnv.api,
    });
  },
  seedAdmin: async (config) => {
    await seedLocalAdminUser({
      databaseUrl: requireEnv(config.runtimeEnv.api, "DATABASE_URL"),
      // Supabase creds are optional: when absent the seeder upserts the admin
      // profile directly via Postgres (LOCAL_DEV_AUTH bypass).
      supabaseUrl: config.runtimeEnv.api.SUPABASE_URL ?? "",
      serviceRoleKey: config.runtimeEnv.api.SUPABASE_SECRET_KEY ?? "",
      email: requireEnv(config.runtimeEnv.api, "LOCAL_DEV_ADMIN_EMAIL"),
      password: requireEnv(config.runtimeEnv.api, "LOCAL_DEV_ADMIN_PASSWORD"),
      localDevAuthEnabled: requireEnv(config.runtimeEnv.api, "LOCAL_DEV_AUTH_ENABLED") === "true",
      localDevAdminAuthUid: requireEnv(config.runtimeEnv.api, "LOCAL_DEV_ADMIN_AUTH_UID"),
    });
  },
  startApi: async (config) => {
    const api = startManagedProcess(["pnpm", "--filter", "@repo/api", "dev"], {
      cwd: config.repoRoot,
      env: config.runtimeEnv.api,
      label: "api",
    });
    await waitForHttp(`http://127.0.0.1:${config.runtimeEnv.api.PORT}/health`);
    return api;
  },
  runCommand: async (command, config) => {
    await runCommand(command, {
      cwd: config.repoRoot,
      env: { ...config.runtimeEnv.api, ...config.runtimeEnv.web },
    });
  },
  composeDown: async (config) => {
    await runCommand(
      ["docker", "compose", "-f", "docker-compose.local.yml", "-p", config.projectName, "down"],
      {
        cwd: config.repoRoot,
        env: config.runtimeEnv.compose,
      },
    );
  },
};

export function buildComposeUpCommand(
  projectName: string,
  services: string[] = ["postgres", "redis"],
): string[] {
  return [
    "docker",
    "compose",
    "-f",
    "docker-compose.local.yml",
    "-p",
    projectName,
    "up",
    "-d",
    "--wait",
    ...services,
  ];
}

export function buildViteDevCommand(packageName: string, port: string): string[] {
  return ["pnpm", "--filter", packageName, "dev", "--host", "127.0.0.1", "--port", port];
}

function requireEnv(env: Record<string, string>, key: string): string {
  const value = env[key];
  if (value === undefined) throw new Error(`Missing local environment value: ${key}`);
  return value;
}

export async function runE2eEnvironment(
  config: EnvironmentConfig,
  driver: EnvironmentDriver = defaultDriver,
): Promise<void> {
  let api: ManagedProcess | undefined;

  try {
    await driver.composeUp(config);
    await driver.runMigrations(config);
    await driver.seedAdmin(config);
    api = await driver.startApi(config);
    await driver.runCommand(config.e2eCommand, config);
  } finally {
    await api?.stop();
    await driver.composeDown(config);
  }
}

export async function runLightBootstrap(
  config: EnvironmentConfig,
  driver: EnvironmentDriver = defaultDriver,
): Promise<void> {
  await driver.composeUp(config, ["redis"]);
}
