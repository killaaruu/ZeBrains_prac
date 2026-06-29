import { describe, expect, it } from "vitest";
import {
  buildApiDevCommand,
  buildDevProcessSpecs,
  buildWebDevCommand,
  buildWorkerDevCommand,
} from "./dev-processes";

describe("dev process commands", () => {
  it("builds the API dev command", () => {
    expect(buildApiDevCommand()).toEqual(["pnpm", "--filter", "@repo/api", "dev"]);
  });

  it("builds the worker dev command", () => {
    expect(buildWorkerDevCommand()).toEqual(["pnpm", "--filter", "@repo/api", "dev:worker"]);
  });

  it("passes Vite host and port args directly to the web dev script", () => {
    expect(buildWebDevCommand("4173")).toEqual([
      "pnpm",
      "--filter",
      "@repo/web",
      "dev",
      "--host",
      "127.0.0.1",
      "--port",
      "4173",
    ]);
  });

  it("includes api, worker, and web in the local dev process list", () => {
    expect(buildDevProcessSpecs("4173")).toEqual([
      {
        command: ["pnpm", "--filter", "@repo/api", "dev"],
        envScope: "api",
        label: "api",
      },
      {
        command: ["pnpm", "--filter", "@repo/api", "dev:worker"],
        envScope: "api",
        label: "worker",
      },
      {
        command: ["pnpm", "--filter", "@repo/web", "dev", "--host", "127.0.0.1", "--port", "4173"],
        envScope: "web",
        label: "web",
      },
    ]);
  });
});
