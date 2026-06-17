import { basename, join } from "node:path";
import type { DocRef } from "../types";
import { walkFiles } from "./fs-utils";

/** Find docs under `docs/` whose path contains any of `slugs`. */
export function scanDocs(repoRoot: string, slugs: string[]): DocRef[] {
  const files = walkFiles(join(repoRoot, "docs"));
  const seen = new Set<string>();
  const out: DocRef[] = [];
  for (const path of files) {
    if (!slugs.some((slug) => path.includes(slug))) continue;
    if (seen.has(path)) continue;
    seen.add(path);
    out.push({ title: basename(path), path });
  }
  return out;
}
