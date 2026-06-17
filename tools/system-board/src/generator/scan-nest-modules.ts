import { readFileSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";
import type { NestModule } from "../types";
import { walkFiles } from "./fs-utils";

const MODULES_ROOT = "apps/api/src/modules";
const MODULE_FILE = /\.module\.ts$/;
const TEST_FILE = /\.(test|spec)\.tsx?$/;
const CLASS_RE = /export class (\w+)/;
const MODULE_IDENT = /\b([A-Z]\w*Module)\b/g;

/** Extract the first `imports: [...]` block's module identifiers. Heuristic. */
function parseImportNames(content: string): string[] {
  const start = content.search(/imports\s*:\s*\[/);
  if (start === -1) return [];
  const from = content.indexOf("[", start);
  if (from === -1) return [];
  let depth = 1;
  let i = from + 1;
  for (; i < content.length && depth > 0; i++) {
    if (content[i] === "[") depth++;
    else if (content[i] === "]") depth--;
  }
  const block = content.slice(from + 1, i - 1);
  const names = new Set<string>();
  for (const match of block.matchAll(MODULE_IDENT)) if (match[1]) names.add(match[1]);
  return [...names];
}

/** Path-based id: directory of the module file, relative to MODULES_ROOT, with "/" separators. */
function moduleId(repoRoot: string, file: string): string {
  return relative(join(repoRoot, MODULES_ROOT), dirname(file)).split(sep).join("/");
}

/** Discover all NestJS modules under apps/api/src/modules with structure + imports. */
export function scanNestModules(repoRoot: string): NestModule[] {
  const files = walkFiles(join(repoRoot, MODULES_ROOT)).filter(
    (f) => MODULE_FILE.test(f) && !TEST_FILE.test(f),
  );

  const partials = files.map((file) => {
    const content = readFileSync(file, "utf8");
    const id = moduleId(repoRoot, file);
    return {
      id,
      name: content.match(CLASS_RE)?.[1] ?? id.split("/").pop() ?? id,
      topLevel: id.split("/")[0] ?? id,
      file: { name: file.split(sep).pop() ?? id, path: file },
      importNames: parseImportNames(content),
    };
  });

  const idSet = new Set(partials.map((p) => p.id));
  const nameToId = new Map(partials.map((p) => [p.name, p.id]));

  function nearestParent(id: string): string | null {
    const segments = id.split("/");
    for (let i = segments.length - 1; i > 0; i--) {
      const candidate = segments.slice(0, i).join("/");
      if (idSet.has(candidate)) return candidate;
    }
    return null;
  }

  const modules: NestModule[] = partials.map((p) => {
    const importIds: string[] = [];
    const importExternal: string[] = [];
    for (const name of p.importNames) {
      const resolved = nameToId.get(name);
      if (resolved) importIds.push(resolved);
      else importExternal.push(name);
    }
    return {
      id: p.id,
      name: p.name,
      topLevel: p.topLevel,
      file: p.file,
      parentId: nearestParent(p.id),
      childIds: [],
      importIds,
      importExternal,
      tests: { total: 0, files: 0 },
      docs: [],
      architectureMd: "",
      status: null,
      integrations: [],
    };
  });

  const byId = new Map(modules.map((m) => [m.id, m]));
  for (const m of modules) {
    if (m.parentId) byId.get(m.parentId)?.childIds.push(m.id);
  }
  return modules;
}

export { MODULES_ROOT };
