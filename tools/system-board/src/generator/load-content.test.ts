import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { loadContent } from "./load-content";

describe("loadContent", () => {
  let dir: string;
  beforeAll(() => {
    dir = mkdtempSync(join(tmpdir(), "content-"));
    writeFileSync(
      join(dir, "products.yaml"),
      [
        "products:",
        "  - id: sales-os",
        "    title: SalesOS",
        "    tagline: pre-sale",
        "    status: mvp",
        "    slugs: [sales-os, cv-adapter]",
        "    integrations:",
        "      - { target: supabase, kind: storage }",
        "externalSystems:",
        "  - { id: supabase, title: Supabase }",
      ].join("\n"),
    );
    mkdirSync(join(dir, "sales-os"), { recursive: true });
    writeFileSync(join(dir, "sales-os/architecture.md"), "# Arch\nflow");
    writeFileSync(join(dir, "sales-os/tests.md"), "# Key\n- happy path\n- error path\n\ntext");
  });

  it("parses products, external systems, architecture and key tests", () => {
    const content = loadContent(dir);
    expect(content.products[0]).toMatchObject({
      id: "sales-os",
      title: "SalesOS",
      slugs: ["sales-os", "cv-adapter"],
      integrations: [{ target: "supabase", kind: "storage" }],
    });
    expect(content.externalSystems).toEqual([{ id: "supabase", title: "Supabase" }]);
    expect(content.architecture["sales-os"]).toBe("# Arch\nflow");
    expect(content.testsKey["sales-os"]).toEqual(["happy path", "error path"]);
  });

  it("tolerates missing md files (empty arch, no key tests)", () => {
    const empty = mkdtempSync(join(tmpdir(), "content-empty-"));
    writeFileSync(
      join(empty, "products.yaml"),
      "products:\n  - id: x\n    title: X\n    tagline: t\n    status: prod\n    slugs: [x]\n    integrations: []\nexternalSystems: []",
    );
    const content = loadContent(empty);
    expect(content.architecture.x).toBe("");
    expect(content.testsKey.x).toEqual([]);
  });

  it("throws when products.yaml is a bare scalar instead of a mapping", () => {
    const malformed = mkdtempSync(join(tmpdir(), "content-malformed-"));
    writeFileSync(join(malformed, "products.yaml"), "just a string");
    expect(() => loadContent(malformed)).toThrow(/mapping|object/i);
  });

  it("deduplicates key scenarios preserving first-seen order", () => {
    const dupDir = mkdtempSync(join(tmpdir(), "content-dup-"));
    writeFileSync(
      join(dupDir, "products.yaml"),
      "products:\n  - id: dup\n    title: Dup\n    tagline: t\n    status: prod\n    slugs: [dup]\n    integrations: []\nexternalSystems: []",
    );
    mkdirSync(join(dupDir, "dup"), { recursive: true });
    writeFileSync(
      join(dupDir, "dup/tests.md"),
      "# Key\n- happy path\n- error path\n- happy path\n- happy path\n",
    );
    const content = loadContent(dupDir);
    expect(content.testsKey.dup).toEqual(["happy path", "error path"]);
  });
});
