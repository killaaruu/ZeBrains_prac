import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const currentDir = dirname(fileURLToPath(import.meta.url));

describe("db-backend seed entrypoints", () => {
  it("does not keep an unused placeholder seed script in src", () => {
    expect(existsSync(resolve(currentDir, "seed.ts"))).toBe(false);
  });
});
