import { type ChildProcess, spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import { mergeEnv } from "./env";

export type ManagedProcess = {
  stop: () => Promise<void>;
};

export async function runCommand(
  command: string[],
  options: { cwd: string; env?: Record<string, string>; stdio?: "inherit" | "pipe" },
): Promise<void> {
  const [bin, ...args] = command;
  if (!bin) throw new Error("Cannot run an empty command");

  await new Promise<void>((resolve, reject) => {
    const child = spawn(bin, args, {
      cwd: options.cwd,
      env: mergeEnv(process.env, options.env ?? {}),
      stdio: options.stdio ?? "inherit",
    });

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
  const [bin, ...args] = command;
  if (!bin) throw new Error("Cannot start an empty command");

  const child = spawn(bin, args, {
    cwd: options.cwd,
    env: mergeEnv(process.env, options.env ?? {}),
    stdio: "inherit",
  });

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
