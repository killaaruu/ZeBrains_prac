import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import type { ContentData } from "../types";
import { buildModules } from "./build-modules";

describe("buildModules", () => {
  let repo: string;
  const content: ContentData = {
    products: [
      {
        id: "dataos",
        title: "DataOS",
        tagline: "t",
        status: "prod",
        slugs: ["dataos"],
        integrations: [{ target: "supabase", kind: "storage" }],
      },
    ],
    externalSystems: [],
    architecture: { dataos: "# DataOS arch" },
    testsKey: {},
  };

  beforeAll(() => {
    repo = mkdtempSync(join(tmpdir(), "bm-"));
    const mods = join(repo, "apps/api/src/modules");
    mkdirSync(join(mods, "dataos/sync"), { recursive: true });
    writeFileSync(join(mods, "dataos/dataos.module.ts"), `export class DataosModule {}`);
    writeFileSync(join(mods, "dataos/sync/sync.module.ts"), `export class SyncModule {}`);
    // test in parent dir (counts for dataos), test in child dir (counts for dataos/sync)
    writeFileSync(join(mods, "dataos/dataos.service.test.ts"), `it("a",()=>{}); it("b",()=>{});`);
    writeFileSync(join(mods, "dataos/sync/sync.service.test.ts"), `it("c",()=>{});`);
    mkdirSync(join(repo, "docs"), { recursive: true });
    writeFileSync(join(repo, "docs/dataos-v2-prd.md"), "x");
  });

  it("counts tests per module excluding child-module dirs", () => {
    const mods = buildModules(repo, content);
    const dataos = mods.find((m) => m.id === "dataos")!;
    expect(dataos.tests).toEqual({ files: 1, total: 2 });
    const sync = mods.find((m) => m.id === "dataos/sync")!;
    expect(sync.tests).toEqual({ files: 1, total: 1 });
  });

  it("attaches docs to top-level modules only", () => {
    const mods = buildModules(repo, content);
    expect(mods.find((m) => m.id === "dataos")!.docs.map((d) => d.title)).toEqual([
      "dataos-v2-prd.md",
    ]);
    expect(mods.find((m) => m.id === "dataos/sync")!.docs).toEqual([]);
  });

  it("overlays curated product data on the matching top-level module", () => {
    const mods = buildModules(repo, content);
    const dataos = mods.find((m) => m.id === "dataos")!;
    expect(dataos.architectureMd).toBe("# DataOS arch");
    expect(dataos.status).toBe("prod");
    expect(dataos.integrations).toEqual([{ target: "supabase", kind: "storage" }]);
    // sub-module gets no curated overlay
    expect(mods.find((m) => m.id === "dataos/sync")!.status).toBeNull();
  });
});
