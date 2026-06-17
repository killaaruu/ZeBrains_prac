/**
 * Deterministic merge step for the ddd-doc Haiku workflow.
 *
 * Reads per-component markdown from <docsDir>/<module>/<componentId>.md and writes
 * each into the matching component's `<field>:` (default `docs`) in the co-located
 * `*.ddd.yaml`. Uses yaml's Document API so comments + formatting of untouched nodes
 * are preserved. Never overwrites a field that already has authored content.
 *
 *   tsx src/generator/apply-docs.ts <docsDir> [field=docs]
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { type Document, isMap, parseDocument } from "yaml";
import { walkFiles } from "./fs-utils";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, "..", "..", "..", "..");

function dddFiles(): string[] {
  return walkFiles(join(repoRoot, "apps", "api", "src", "modules")).filter((f) =>
    f.endsWith(".ddd.yaml"),
  );
}

function applyToModule(file: string, docsDir: string, field: string, overwrite: boolean): number {
  const doc: Document = parseDocument(readFileSync(file, "utf8"));
  const moduleName = String(doc.get("module") ?? "");
  const components = doc.get("components");
  if (
    !moduleName ||
    !components ||
    typeof (components as { items?: unknown }).items === "undefined"
  )
    return 0;

  let applied = 0;
  for (const item of (components as { items: unknown[] }).items) {
    if (!isMap(item)) continue;
    const id = String(item.get("id") ?? "");
    if (!id) continue;
    if (item.get(field) && !overwrite) continue; // default: never clobber authored content
    const mdPath = join(docsDir, moduleName, `${id}.md`);
    if (!existsSync(mdPath)) continue;
    const md = readFileSync(mdPath, "utf8").trim();
    if (!md) continue;
    if (overwrite && String(item.get(field) ?? "").trim() === md) continue; // no-op
    item.set(field, md);
    applied++;
  }
  if (applied > 0) writeFileSync(file, doc.toString());
  return applied;
}

function run(): void {
  const docsDir = process.argv[2];
  const rest = process.argv.slice(3);
  const overwrite = rest.includes("--overwrite");
  const field = rest.find((a) => !a.startsWith("--")) ?? "docs";
  if (!docsDir) {
    console.error("usage: tsx src/generator/apply-docs.ts <docsDir> [field=docs] [--overwrite]");
    process.exit(2);
  }
  let total = 0;
  for (const file of dddFiles()) {
    const n = applyToModule(file, docsDir, field, overwrite);
    if (n > 0) console.log(`[apply-docs] ${n} ${field} → ${file}`);
    total += n;
  }
  const mode = overwrite ? " (overwrite)" : "";
  console.log(`[apply-docs] applied ${total} component ${field}${mode}`);
}

const isDirectRun = process.argv[1] === fileURLToPath(import.meta.url);
if (isDirectRun) run();
