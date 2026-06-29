import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("api client import strategy", () => {
  it("does not lazy-load the Supabase bootstrap module", () => {
    const source = readFileSync(join(import.meta.dirname, "api-client.ts"), "utf8");

    expect(source).not.toContain('import("./supabase")');
  });
});
