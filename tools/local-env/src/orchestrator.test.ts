import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildComposeUpCommand,
  buildViteDevCommand,
  runE2eEnvironment,
  runLightBootstrap,
} from "./orchestrator";

describe("buildComposeUpCommand", () => {
  it("brings up postgres + redis and waits for health before migrations run", () => {
    expect(buildComposeUpCommand("app-local-test")).toEqual([
      "docker",
      "compose",
      "-f",
      "docker-compose.local.yml",
      "-p",
      "app-local-test",
      "up",
      "-d",
      "--wait",
      "postgres",
      "redis",
    ]);
  });

  it("uses Redis noeviction policy for BullMQ local queues", () => {
    const compose = readFileSync(resolve(process.cwd(), "../../docker-compose.local.yml"), "utf-8");

    expect(compose).toContain("--maxmemory-policy noeviction");
    expect(compose).not.toContain("--maxmemory-policy allkeys-lru");
  });

  it("uses a named Postgres volume so local data survives container recreation", () => {
    const compose = readFileSync(resolve(process.cwd(), "../../docker-compose.local.yml"), "utf-8");

    expect(compose).toContain("postgres_data:/var/lib/postgresql/data");
    expect(compose).toContain("volumes:");
    expect(compose).toContain("postgres_data:");
  });

  it("starts only redis when given an explicit services list (light mode)", () => {
    expect(buildComposeUpCommand("app-local-test", ["redis"])).toEqual([
      "docker",
      "compose",
      "-f",
      "docker-compose.local.yml",
      "-p",
      "app-local-test",
      "up",
      "-d",
      "--wait",
      "redis",
    ]);
  });
});

describe("buildViteDevCommand", () => {
  it("passes host and port directly to the package dev script", () => {
    expect(buildViteDevCommand("@repo/web", "32330")).toEqual([
      "pnpm",
      "--filter",
      "@repo/web",
      "dev",
      "--host",
      "127.0.0.1",
      "--port",
      "32330",
    ]);
  });
});

describe("runE2eEnvironment", () => {
  it("runs compose, migrations, API, e2e command, and cleanup in order", async () => {
    const events: string[] = [];

    await runE2eEnvironment(
      {
        e2eCommand: ["pnpm", "--filter", "@repo/api", "test:e2e"],
        projectName: "app-local-test",
        repoRoot: "/repo",
        runtimeEnv: { api: {}, web: {}, compose: {} },
      },
      {
        composeUp: async () => {
          events.push("compose up");
        },
        runMigrations: async () => {
          events.push("migrate");
        },
        seedAdmin: async () => {
          events.push("seed admin");
        },
        startApi: async () => {
          events.push("start api");
          return {
            stop: async () => {
              events.push("stop api");
            },
          };
        },
        runCommand: async (command) => {
          events.push(`run ${command.join(" ")}`);
        },
        composeDown: async () => {
          events.push("compose down");
        },
      },
    );

    expect(events).toEqual([
      "compose up",
      "migrate",
      "seed admin",
      "start api",
      "run pnpm --filter @repo/api test:e2e",
      "stop api",
      "compose down",
    ]);
  });

  it("cleans up API and compose when the e2e command fails", async () => {
    const events: string[] = [];

    await expect(
      runE2eEnvironment(
        {
          e2eCommand: ["pnpm", "--filter", "@repo/api", "test:e2e"],
          projectName: "app-local-test",
          repoRoot: "/repo",
          runtimeEnv: { api: {}, web: {}, compose: {} },
        },
        {
          composeUp: async () => {
            events.push("compose up");
          },
          runMigrations: async () => {
            events.push("migrate");
          },
          seedAdmin: async () => {
            events.push("seed admin");
          },
          startApi: async () => {
            events.push("start api");
            return {
              stop: async () => {
                events.push("stop api");
              },
            };
          },
          runCommand: async () => {
            events.push("run command");
            throw new Error("e2e failed");
          },
          composeDown: async () => {
            events.push("compose down");
          },
        },
      ),
    ).rejects.toThrow("e2e failed");

    expect(events).toEqual([
      "compose up",
      "migrate",
      "seed admin",
      "start api",
      "run command",
      "stop api",
      "compose down",
    ]);
  });
});

describe("runLightBootstrap", () => {
  it("brings up only redis and never migrates or seeds", async () => {
    const events: string[] = [];

    await runLightBootstrap(
      {
        e2eCommand: [],
        projectName: "app-local-test",
        repoRoot: "/repo",
        runtimeEnv: { api: {}, web: {}, compose: {} },
      },
      {
        composeUp: async (_config, services) => {
          events.push(`compose up ${(services ?? ["all"]).join(",")}`);
        },
        runMigrations: async () => {
          events.push("migrate");
        },
        seedAdmin: async () => {
          events.push("seed admin");
        },
        startApi: async () => ({ stop: async () => {} }),
        runCommand: async () => {},
        composeDown: async () => {
          events.push("compose down");
        },
      },
    );

    expect(events).toEqual(["compose up redis"]);
  });
});
