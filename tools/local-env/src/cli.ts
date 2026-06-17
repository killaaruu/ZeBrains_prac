import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { cwd, exit } from "node:process";
import { buildLightRuntimeEnv, buildRuntimeEnv } from "./env";
import {
  buildViteDevCommand,
  defaultDriver,
  type EnvironmentConfig,
  runE2eEnvironment,
  runLightBootstrap,
} from "./orchestrator";
import { allocateLocalPorts } from "./ports";
import { type ManagedProcess, startManagedProcess } from "./processes";
import { resolveRepoRoot } from "./repo-root";
import { writeLocalState } from "./state";
import {
  ensureLocalSupabaseStarted,
  parseEnvFile,
  resolveSupabaseRuntimeEnv,
} from "./supabase-env";
import { buildComposeProjectName, deriveWorktreeId } from "./worktree";

const DEFAULT_E2E_COMMAND = ["pnpm", "--filter", "@repo/api", "test:e2e"];

async function main(): Promise<void> {
  const [mode, separatorOrFirstCommand, ...rest] = process.argv.slice(2);

  if (mode === "dev") {
    await runDev();
    return;
  }

  if (mode === "light") {
    await runLight();
    return;
  }

  if (mode === "e2e") {
    const command = separatorOrFirstCommand
      ? [separatorOrFirstCommand, ...rest].filter((part) => part !== "--")
      : DEFAULT_E2E_COMMAND;
    await runE2e(command.length > 0 ? command : DEFAULT_E2E_COMMAND);
    return;
  }

  printUsage();
  exit(mode ? 1 : 0);
}

async function buildConfig(
  mode: "dev" | "e2e",
  e2eCommand: string[] = DEFAULT_E2E_COMMAND,
): Promise<EnvironmentConfig> {
  const repoRoot = resolveRepoRoot({ cwd: cwd(), env: process.env });
  const worktreeId = deriveWorktreeId(repoRoot);
  const ports = await allocateLocalPorts(worktreeId);
  await ensureLocalSupabaseStarted(repoRoot, process.env);
  const supabase = await resolveSupabaseRuntimeEnv(repoRoot, process.env, { preferLocal: true });
  const runtimeEnv = buildRuntimeEnv({ ...ports, rootDir: repoRoot, supabase });
  const projectName = buildComposeProjectName(worktreeId);

  await writeLocalState(
    repoRoot,
    {
      mode,
      projectName,
      ports,
      urls: {
        api: `http://127.0.0.1:${ports.apiPort}`,
        web: `http://127.0.0.1:${ports.webPort}`,
      },
    },
    runtimeEnv,
  );

  return { repoRoot, projectName, runtimeEnv, e2eCommand };
}

async function runDev(): Promise<void> {
  const config = await buildConfig("dev");
  const processes: ManagedProcess[] = [];

  const cleanup = async () => {
    await Promise.all(processes.splice(0).map((managed) => managed.stop()));
    await defaultDriver.composeDown(config);
  };

  process.once("SIGINT", () => void cleanup().then(() => exit(130)));
  process.once("SIGTERM", () => void cleanup().then(() => exit(143)));

  await defaultDriver.composeUp(config);
  await defaultDriver.runMigrations(config);
  await defaultDriver.seedAdmin(config);

  processes.push(
    startManagedProcess(["pnpm", "--filter", "@repo/api", "dev"], {
      cwd: config.repoRoot,
      env: config.runtimeEnv.api,
      label: "api",
    }),
    startManagedProcess(
      buildViteDevCommand("@repo/web", config.runtimeEnv.web.VITE_WEB_PORT ?? "5173"),
      {
        cwd: config.repoRoot,
        env: config.runtimeEnv.web,
        label: "web",
      },
    ),
  );

  printUrls(config);
}

async function readApiDotEnv(repoRoot: string): Promise<Record<string, string>> {
  const path = join(repoRoot, "apps/api/.env");
  try {
    return parseEnvFile(await readFile(path, "utf8"));
  } catch (error) {
    if ((error as { code?: string }).code === "ENOENT") {
      throw new Error(
        "apps/api/.env not found — local-light needs cloud config from apps/api/.env",
      );
    }
    throw error;
  }
}

async function buildLightConfig(): Promise<EnvironmentConfig> {
  const repoRoot = resolveRepoRoot({ cwd: cwd(), env: process.env });
  const worktreeId = deriveWorktreeId(repoRoot);
  const ports = await allocateLocalPorts(worktreeId);
  const apiDotEnv = await readApiDotEnv(repoRoot);
  const runtimeEnv = buildLightRuntimeEnv({
    apiPort: ports.apiPort,
    webPort: ports.webPort,
    redisPort: ports.redisPort,
    apiDotEnv,
  });
  const projectName = buildComposeProjectName(worktreeId);

  await writeLocalState(
    repoRoot,
    {
      mode: "light",
      projectName,
      ports,
      urls: {
        api: `http://127.0.0.1:${ports.apiPort}`,
        web: `http://127.0.0.1:${ports.webPort}`,
      },
    },
    runtimeEnv,
  );

  return { repoRoot, projectName, runtimeEnv, e2eCommand: [] };
}

async function runLight(): Promise<void> {
  const config = await buildLightConfig();
  const processes: ManagedProcess[] = [];

  const cleanup = async () => {
    await Promise.all(processes.splice(0).map((managed) => managed.stop()));
    await defaultDriver.composeDown(config);
  };

  process.once("SIGINT", () => void cleanup().then(() => exit(130)));
  process.once("SIGTERM", () => void cleanup().then(() => exit(143)));

  await runLightBootstrap(config);

  processes.push(
    startManagedProcess(["pnpm", "--filter", "@repo/api", "dev"], {
      cwd: config.repoRoot,
      env: config.runtimeEnv.api,
      label: "api",
    }),
    startManagedProcess(
      buildViteDevCommand("@repo/web", config.runtimeEnv.web.VITE_WEB_PORT ?? "5173"),
      {
        cwd: config.repoRoot,
        env: config.runtimeEnv.web,
        label: "web",
      },
    ),
  );

  printUrls(config);
}

async function runE2e(command: string[]): Promise<void> {
  const config = await buildConfig("e2e", command);
  printUrls(config);
  await runE2eEnvironment(config);
}

function printUrls(config: EnvironmentConfig): void {
  console.log("Local environment ready:");
  console.log(`  API:  http://127.0.0.1:${config.runtimeEnv.api.PORT}`);
  console.log(`  Web:  ${config.runtimeEnv.web.VITE_ALLOWED_RETURN_ORIGINS}`);
  console.log("  State: .local-env/");
}

function printUsage(): void {
  console.log("Usage:");
  console.log("  pnpm local dev");
  console.log("  pnpm local light");
  console.log("  pnpm local e2e");
  console.log("  pnpm local e2e -- <custom command>");
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  exit(1);
});
