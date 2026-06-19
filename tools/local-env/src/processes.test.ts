import { afterEach, describe, expect, it } from "vitest";
import {
  buildSpawnCommand,
  buildSpawnOptions,
  resolveExecutableCommand,
  shouldUseWindowsShell,
  waitForHttp,
} from "./processes";

describe("resolveExecutableCommand", () => {
  it("resolves pnpm.cmd from PATH on Windows", () => {
    const resolved = resolveExecutableCommand(
      "pnpm",
      {
        PATH: "C:\\Program Files\\nodejs;C:\\other",
        PATHEXT: ".EXE;.CMD",
      },
      "win32",
      (candidate) => candidate === "C:\\Program Files\\nodejs\\pnpm.cmd",
    );

    expect(resolved).toBe("C:\\Program Files\\nodejs\\pnpm.cmd");
  });

  it("leaves executable names unchanged on non-Windows platforms", () => {
    const resolved = resolveExecutableCommand("pnpm", { PATH: "/usr/bin" }, "linux");

    expect(resolved).toBe("pnpm");
  });
});

describe("Windows command spawning", () => {
  it("uses the Windows shell for cmd shims", () => {
    expect(shouldUseWindowsShell("C:\\Program Files\\nodejs\\pnpm.cmd", "win32")).toBe(true);
    expect(shouldUseWindowsShell("C:\\Program Files\\Docker\\docker.exe", "win32")).toBe(false);
  });

  it("wraps cmd shims through powershell on Windows", () => {
    const spawnCommand = buildSpawnCommand({
      command: "C:\\Program Files\\nodejs\\pnpm.cmd",
      args: ["--filter", "@repo/db-backend", "migrate"],
      env: { SystemRoot: "C:\\WINDOWS" },
      platform: "win32",
    });

    expect(spawnCommand).toEqual({
      command: "C:\\WINDOWS\\System32\\WindowsPowerShell\\v1.0\\powershell.exe",
      args: [
        "-NoProfile",
        "-Command",
        "& 'C:\\Program Files\\nodejs\\pnpm.cmd' '--filter' '@repo/db-backend' 'migrate'",
      ],
    });
  });

  it("disables shell mode after wrapping cmd shims", () => {
    const spawnOptions = buildSpawnOptions({
      cwd: "C:/repo",
      env: process.env,
      stdio: "inherit",
      command: "C:\\WINDOWS\\System32\\WindowsPowerShell\\v1.0\\powershell.exe",
    });

    expect(spawnOptions).toEqual(
      expect.objectContaining({
        shell: false,
      }),
    );
  });
});

describe("waitForHttp", () => {
  const originalTimeout = process.env.LOCAL_ENV_HTTP_TIMEOUT_MS;

  afterEach(() => {
    if (originalTimeout === undefined) {
      delete process.env.LOCAL_ENV_HTTP_TIMEOUT_MS;
    } else {
      process.env.LOCAL_ENV_HTTP_TIMEOUT_MS = originalTimeout;
    }
  });

  it("uses LOCAL_ENV_HTTP_TIMEOUT_MS when no explicit timeout is provided", async () => {
    process.env.LOCAL_ENV_HTTP_TIMEOUT_MS = "10";

    await expect(waitForHttp("http://127.0.0.1:9/health")).rejects.toThrow(
      "Timed out waiting for http://127.0.0.1:9/health",
    );
  });
});
