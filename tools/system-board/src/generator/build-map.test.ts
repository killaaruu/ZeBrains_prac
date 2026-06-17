import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { buildMap } from "./build-map";

describe("buildMap", () => {
  let repo: string;
  let content: string;
  beforeAll(() => {
    repo = mkdtempSync(join(tmpdir(), "repo-"));
    mkdirSync(join(repo, "apps/api/src/modules/sales-os/quotes"), { recursive: true });
    writeFileSync(
      join(repo, "apps/api/src/modules/sales-os/sales-os.module.ts"),
      "export class SalesOsModule {}",
    );
    mkdirSync(join(repo, "docs"), { recursive: true });
    writeFileSync(join(repo, "docs/sales-os-prd.md"), "x");

    content = mkdtempSync(join(tmpdir(), "content-"));
    writeFileSync(
      join(content, "products.yaml"),
      [
        "products:",
        "  - id: sales-os",
        "    title: SalesOS",
        "    tagline: pre-sale",
        "    status: mvp",
        "    slugs: [sales-os]",
        "    integrations:",
        "      - { target: supabase, kind: storage }",
        "      - { target: dataos, kind: internal }",
        "externalSystems:",
        "  - { id: supabase, title: Supabase }",
      ].join("\n"),
    );
    mkdirSync(join(content, "sales-os"), { recursive: true });
    writeFileSync(join(content, "sales-os/architecture.md"), "arch");
    writeFileSync(join(content, "sales-os/tests.md"), "- happy");
  });

  it("assembles a product with merged facts and curated content", () => {
    const map = buildMap(repo, content);
    const product = map.products[0]!;
    expect(product.id).toBe("sales-os");
    expect(product.architectureMd).toBe("arch");
    expect(product.modules.backend.map((n) => n.name)).toContain("quotes");
    expect(product.docs.map((d) => d.title)).toEqual(["sales-os-prd.md"]);
    expect(product.tests.key).toEqual(["happy"]);
    expect(product.tests.files).toBe(0);
  });

  it("builds canvas nodes for products + externals and edges from integrations", () => {
    const map = buildMap(repo, content);
    expect(map.canvas.nodes).toContainEqual({ id: "sales-os", label: "SalesOS", kind: "product" });
    expect(map.canvas.nodes).toContainEqual({
      id: "supabase",
      label: "Supabase",
      kind: "external",
    });
    expect(map.canvas.edges).toContainEqual({
      id: "sales-os->supabase",
      source: "sales-os",
      target: "supabase",
      label: "storage",
    });
    expect(map.canvas.edges).toContainEqual({
      id: "sales-os->dataos",
      source: "sales-os",
      target: "dataos",
      label: "internal",
    });
  });

  it("includes auto-discovered NestJS modules", () => {
    const map = buildMap(repo, content);
    expect(Array.isArray(map.modules)).toBe(true);
    expect(map.modules.find((m) => m.id === "sales-os")).toBeDefined();
  });

  it("warns when an integration target resolves to no canvas node", () => {
    const danglingRepo = mkdtempSync(join(tmpdir(), "repo-dangling-"));
    const danglingContent = mkdtempSync(join(tmpdir(), "content-dangling-"));
    writeFileSync(
      join(danglingContent, "products.yaml"),
      [
        "products:",
        "  - id: sales-os",
        "    title: SalesOS",
        "    tagline: pre-sale",
        "    status: mvp",
        "    slugs: [sales-os]",
        "    integrations:",
        "      - { target: typoxyz, kind: x }",
        "externalSystems: []",
      ].join("\n"),
    );
    mkdirSync(join(danglingContent, "sales-os"), { recursive: true });
    writeFileSync(join(danglingContent, "sales-os/architecture.md"), "");
    writeFileSync(join(danglingContent, "sales-os/tests.md"), "");

    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      buildMap(danglingRepo, danglingContent);
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("typoxyz"));
    } finally {
      warnSpy.mockRestore();
    }
  });
});
