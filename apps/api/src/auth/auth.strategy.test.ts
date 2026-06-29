import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const currentDir = dirname(fileURLToPath(import.meta.url));

describe("auth strategy entrypoints", () => {
  it("does not keep an unused Passport strategy placeholder beside the active AuthGuard flow", () => {
    expect(existsSync(resolve(currentDir, "auth.strategy.ts"))).toBe(false);
  });
});
