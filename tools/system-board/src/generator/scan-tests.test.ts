import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { scanTests } from "./scan-tests";

describe("scanTests", () => {
  let root: string;
  beforeAll(() => {
    root = mkdtempSync(join(tmpdir(), "scantests-"));
    const dir = join(root, "apps/api/src/modules/sales-os");
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      join(dir, "quote.test.ts"),
      `describe("quote", () => { it("a", () => {}); it("b", () => {}); });`,
    );
    writeFileSync(join(dir, "calc.spec.ts"), `test("adds", () => {});`);
    writeFileSync(join(dir, "quote.ts"), `export const x = 1;`); // not a test
  });

  it("counts test files and describe/it/test occurrences", () => {
    const result = scanTests(root, ["sales-os"]);
    expect(result.files).toBe(2);
    // 1 describe + 2 it + 1 test = 4
    expect(result.total).toBe(4);
  });

  it("returns zeros when nothing matches", () => {
    expect(scanTests(root, ["missing"])).toEqual({ files: 0, total: 0 });
  });
});
