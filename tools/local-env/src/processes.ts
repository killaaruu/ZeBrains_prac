import { type ChildProcess, spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { posix as posixPath, win32 as win32Path } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { mergeEnv } from "./env";

// Pick a path implementation by the *target* platform, not the host OS, so the
// Windows command-resolution logic behaves identically on the Linux CI runner.
function pathFor(platform: NodeJS.Platform) {
  return platform === "win32" ? win32Path : posixPath;
}

export type ManagedProcess = {
  stop: () => Promise<void>;
};

export async function runCommand(
  command: string[],
  options: { cwd: string; env?: Record<string, string>; stdio?: "inherit" | "pipe" },
): Promise<void> {
  const mergedEnv = mergeEnv(process.env, options.env ?? {});
  const [rawBin, ...args] = command;
  const bin = resolveExecutableCommand(rawBin, mergedEnv);
  if (!bin) throw new Error("Cannot run an empty command");
  const spawnCommand = buildSpawnCommand({
    command: bin,
    args,
    env: mergedEnv,
  });
  const spawnOptions = buildSpawnOptions({
    cwd: options.cwd,
    env: mergedEnv,
    stdio: options.stdio ?? "inherit",
    command: spawnCommand.command,
  });

  await new Promise<void>((resolve, reject) => {
    const child = spawn(spawnCommand.command, spawnCommand.args, spawnOptions);

    child.once("error", reject);
    child.once("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Command failed (${code}): ${command.join(" ")}`));
    });
  });
}

export function startManagedProcess(
  command: string[],
  options: { cwd: string; env?: Record<string, string>; label: string },
): ManagedProcess {
  const mergedEnv = mergeEnv(process.env, options.env ?? {});
  const [rawBin, ...args] = command;
  const bin = resolveExecutableCommand(rawBin, mergedEnv);
  if (!bin) throw new Error("Cannot start an empty command");
  const spawnCommand = buildSpawnCommand({
    command: bin,
    args,
    env: mergedEnv,
  });
  const spawnOptions = buildSpawnOptions({
    cwd: options.cwd,
    env: mergedEnv,
    stdio: "inherit",
    command: spawnCommand.command,
  });

  const child = spawn(spawnCommand.command, spawnCommand.args, spawnOptions);

  child.once("error", (error) => {
    console.error(`[${options.label}] failed to start`, error);
  });

  return {
    stop: () => stopChild(child),
  };
}

export async function waitForHttp(
  url: string,
  timeoutMs = Number(process.env.LOCAL_ENV_HTTP_TIMEOUT_MS ?? 60_000),
): Promise<void> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      await delay(500);
    }
  }

  throw new Error(`Timed out waiting for ${url}`);
}

export function resolveExecutableCommand(
  bin: string | undefined,
  env: NodeJS.ProcessEnv,
  platform = process.platform,
  fileExists: (path: string) => boolean = existsSync,
): string | undefined {
  if (!bin) return undefined;

  const p = pathFor(platform);
  if (platform !== "win32" || p.extname(bin) !== "") {
    return bin;
  }

  const pathValue = env.PATH ?? process.env.PATH ?? "";
  const executableExtensions = (env.PATHEXT ?? ".COM;.EXE;.BAT;.CMD")
    .split(";")
    .filter(Boolean)
    .map((value) => value.toLowerCase());

  for (const directory of pathValue.split(p.delimiter).filter(Boolean)) {
    for (const extension of executableExtensions) {
      const candidate = p.join(directory, `${bin}${extension}`);
      if (fileExists(candidate)) {
        return candidate;
      }
    }
  }

  return bin;
}

export function buildSpawnOptions(options: {
  cwd: string;
  env: NodeJS.ProcessEnv;
  stdio: "inherit" | "pipe";
  command: string;
}) {
  return {
    cwd: options.cwd,
    env: options.env,
    stdio: options.stdio,
    shell: false,
  } as const;
}

export function shouldUseWindowsShell(command: string, platform = process.platform): boolean {
  if (platform !== "win32") {
    return false;
  }

  const extension = win32Path.extname(command).toLowerCase();
  return extension === ".cmd" || extension === ".bat";
}

export function buildSpawnCommand(options: {
  command: string;
  args: string[];
  env: NodeJS.ProcessEnv;
  platform?: NodeJS.Platform;
}) {
  const platform = options.platform ?? process.platform;

  if (!shouldUseWindowsShell(options.command, platform)) {
    return {
      command: options.command,
      args: options.args,
    };
  }

  const powerShell =
    options.env.SystemRoot && options.env.SystemRoot.length > 0
      ? win32Path.join(
          options.env.SystemRoot,
          "System32",
          "WindowsPowerShell",
          "v1.0",
          "powershell.exe",
        )
      : "powershell.exe";
  const invocationParts = [
    "&",
    quotePowerShellArgument(options.command),
    ...options.args.map(quotePowerShellArgument),
  ];

  return {
    command: powerShell,
    args: ["-NoProfile", "-Command", invocationParts.join(" ")],
  };
}

function quotePowerShellArgument(value: string): string {
  return `'${value.replace(/'/gu, "''")}'`;
}

async function stopChild(child: ChildProcess): Promise<void> {
  if (child.exitCode !== null || child.signalCode !== null) return;

  await new Promise<void>((resolve) => {
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      resolve();
    }, 5_000);

    child.once("exit", () => {
      clearTimeout(timer);
      resolve();
    });

    child.kill("SIGTERM");
  });
}
