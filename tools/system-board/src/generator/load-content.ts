import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";
import type { ContentData, ExternalSystem, ProductConfig } from "../types";
import { fileExists } from "./fs-utils";

function readFileOr(path: string, fallback: string): string {
  return fileExists(path) ? readFileSync(path, "utf8") : fallback;
}

/**
 * Extract `- bullet` lines from a markdown file as key scenarios.
 * Flattens ALL `- ` bullet lines (including nested) and is intended for `tests.md` only.
 */
function parseKeyScenarios(md: string): string[] {
  const lines = md
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("- "))
    .map((line) => line.slice(2).trim())
    .filter(Boolean);
  return [...new Set(lines)];
}

/** Load curated content: products.yaml + per-product architecture.md/tests.md. */
export function loadContent(contentDir: string): ContentData {
  const raw = parse(readFileSync(join(contentDir, "products.yaml"), "utf8"));
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error(
      `products.yaml must be a YAML mapping, got: ${Array.isArray(raw) ? "array" : typeof raw}`,
    );
  }
  const data = raw as { products?: ProductConfig[]; externalSystems?: ExternalSystem[] };
  const products = data.products ?? [];
  const architecture: Record<string, string> = {};
  const testsKey: Record<string, string[]> = {};
  for (const product of products) {
    architecture[product.id] = readFileOr(join(contentDir, product.id, "architecture.md"), "");
    testsKey[product.id] = parseKeyScenarios(
      readFileOr(join(contentDir, product.id, "tests.md"), ""),
    );
  }
  return { products, externalSystems: data.externalSystems ?? [], architecture, testsKey };
}
