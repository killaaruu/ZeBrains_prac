import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { scanDocs } from "./scan-docs";

describe("scanDocs", () => {
  let root: string;
  beforeAll(() => {
    root = mkdtempSync(join(tmpdir(), "scandocs-"));
    mkdirSync(join(root, "docs/prd"), { recursive: true });
    writeFileSync(join(root, "docs/prd/sales-os-prd.md"), "x");
    writeFileSync(join(root, "docs/prd/dataos-v2-prd.md"), "x");
    mkdirSync(join(root, "docs/adr"), { recursive: true });
    writeFileSync(join(root, "docs/adr/001-unified-module-resolution.md"), "x");
  });

  it("returns docs whose path matches any slug, with title and absolute path", () => {
    const docs = scanDocs(root, ["sales-os"]);
    expect(docs).toEqual([
      { title: "sales-os-prd.md", path: join(root, "docs/prd/sales-os-prd.md") },
    ]);
  });

  it("matches across multiple slugs and dedupes", () => {
    const docs = scanDocs(root, ["sales-os", "dataos"]);
    expect(docs.map((d) => d.title).sort()).toEqual(["dataos-v2-prd.md", "sales-os-prd.md"]);
  });

  it("returns [] when docs dir is absent", () => {
    expect(scanDocs(join(root, "nope"), ["sales-os"])).toEqual([]);
  });
});
