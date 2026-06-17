import { readFileSync } from "node:fs";
import { dirname, join, sep } from "node:path";
import type { ContentData, NestModule } from "../types";
import { walkFiles } from "./fs-utils";
import { scanDocs } from "./scan-docs";
import { MODULES_ROOT, scanNestModules } from "./scan-nest-modules";

const TEST_FILE = /\.(test|spec)\.tsx?$/;
const TEST_CALL = /\b(describe|it|test)\s*\(/g;

/** Count test files/calls directly under `moduleDir`, excluding any child-module dirs. */
function countModuleTests(
  moduleDir: string,
  childDirs: string[],
): { files: number; total: number } {
  let files = 0;
  let total = 0;
  for (const path of walkFiles(moduleDir)) {
    if (!TEST_FILE.test(path)) continue;
    if (childDirs.some((dir) => path.startsWith(dir + sep))) continue;
    files += 1;
    total += readFileSync(path, "utf8").match(TEST_CALL)?.length ?? 0;
  }
  return { files, total };
}

/** Build enriched NestModule[] from structure + curated content. */
export function buildModules(repoRoot: string, content: ContentData): NestModule[] {
  const modules = scanNestModules(repoRoot);
  const dirById = new Map(modules.map((m) => [m.id, dirname(m.file.path)]));
  const productById = new Map(content.products.map((p) => [p.id, p]));

  for (const m of modules) {
    const moduleDir = dirById.get(m.id) ?? join(repoRoot, MODULES_ROOT, m.id);
    const childDirs = m.childIds.map((id) => dirById.get(id)).filter((d): d is string => !!d);
    m.tests = countModuleTests(moduleDir, childDirs);

    if (m.parentId === null) {
      m.docs = scanDocs(repoRoot, [m.topLevel]);
      const product = productById.get(m.id);
      if (product) {
        m.architectureMd = content.architecture[product.id] ?? "";
        m.status = product.status;
        m.integrations = product.integrations;
      }
    }
  }
  return modules;
}
