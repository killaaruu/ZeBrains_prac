import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { scanModules } from "./scan-modules";

describe("scanModules", () => {
  let root: string;
  beforeAll(() => {
    root = mkdtempSync(join(tmpdir(), "scanmod-"));
    mkdirSync(join(root, "apps/api/src/modules/sales-os/quotes"), { recursive: true });
    writeFileSync(join(root, "apps/api/src/modules/sales-os/sales-os.module.ts"), "x");
    mkdirSync(join(root, "apps/web/src/features/sales-os/components"), { recursive: true });
    mkdirSync(join(root, "packages/shared/src/schemas/sales-os"), { recursive: true });
    writeFileSync(join(root, "packages/shared/src/schemas/sales-os/quote.ts"), "x");
    mkdirSync(join(root, "packages/db-backend/src/schema/sales-os"), { recursive: true });
    writeFileSync(join(root, "packages/db-backend/src/schema/sales-os/quotes.ts"), "x");
  });

  it("collects immediate entries per layer with absolute paths", () => {
    const mods = scanModules(root, ["sales-os"]);
    expect(mods.backend.map((n) => n.name).sort()).toEqual(["quotes", "sales-os.module.ts"]);
    expect(mods.backend.find((n) => n.name === "quotes")?.path).toBe(
      join(root, "apps/api/src/modules/sales-os/quotes"),
    );
    expect(mods.frontend.map((n) => n.name)).toEqual(["components"]);
    expect(mods.schemas.map((n) => n.name)).toEqual(["quote.ts"]);
    expect(mods.db.map((n) => n.name)).toEqual(["quotes.ts"]);
  });

  it("merges multiple slugs and yields empty arrays for absent layers", () => {
    const mods = scanModules(root, ["sales-os", "missing-slug"]);
    expect(mods.backend.length).toBe(2);
    const empty = scanModules(root, ["missing-slug"]);
    expect(empty).toEqual({ backend: [], frontend: [], schemas: [], db: [] });
  });

  it("excludes .test.ts and .spec.ts files from module listings", () => {
    const testRoot = mkdtempSync(join(tmpdir(), "scanmod-filter-"));
    mkdirSync(join(testRoot, "apps/api/src/modules/sales-os"), { recursive: true });
    writeFileSync(join(testRoot, "apps/api/src/modules/sales-os/sales-os.service.ts"), "x");
    writeFileSync(join(testRoot, "apps/api/src/modules/sales-os/sales-os.service.test.ts"), "x");
    writeFileSync(join(testRoot, "apps/api/src/modules/sales-os/foo.spec.ts"), "x");
    mkdirSync(join(testRoot, "apps/web/src/features/sales-os"), { recursive: true });
    mkdirSync(join(testRoot, "packages/shared/src/schemas/sales-os"), { recursive: true });
    mkdirSync(join(testRoot, "packages/db-backend/src/schema/sales-os"), { recursive: true });

    const mods = scanModules(testRoot, ["sales-os"]);
    const names = mods.backend.map((n) => n.name);
    expect(names).toContain("sales-os.service.ts");
    expect(names).not.toContain("sales-os.service.test.ts");
    expect(names).not.toContain("foo.spec.ts");
  });
});
