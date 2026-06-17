import { join } from "node:path";
import type { ProductModules, SourceNode } from "../types";
import { listDir } from "./fs-utils";

const LAYER_DIRS = {
  backend: "apps/api/src/modules",
  frontend: "apps/web/src/features",
  schemas: "packages/shared/src/schemas",
  db: "packages/db-backend/src/schema",
} as const;

const TEST_FILE_RE = /\.(test|spec)\.tsx?$/;

function scanLayer(repoRoot: string, layerDir: string, slugs: string[]): SourceNode[] {
  const nodes: SourceNode[] = [];
  for (const slug of slugs) {
    for (const entry of listDir(join(repoRoot, layerDir, slug))) {
      if (TEST_FILE_RE.test(entry.name)) continue;
      nodes.push({ name: entry.name, path: entry.path });
    }
  }
  return nodes;
}

/** Collect modules for `slugs` across all four monorepo layers. */
export function scanModules(repoRoot: string, slugs: string[]): ProductModules {
  return {
    backend: scanLayer(repoRoot, LAYER_DIRS.backend, slugs),
    frontend: scanLayer(repoRoot, LAYER_DIRS.frontend, slugs),
    schemas: scanLayer(repoRoot, LAYER_DIRS.schemas, slugs),
    db: scanLayer(repoRoot, LAYER_DIRS.db, slugs),
  };
}

export { LAYER_DIRS };
