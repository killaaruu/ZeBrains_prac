import { describe, expect, it } from "vitest";
import { buildWebDevCommand } from "./dev-processes";

describe("dev process commands", () => {
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
});
