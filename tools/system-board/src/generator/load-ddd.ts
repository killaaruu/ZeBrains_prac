import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";
import type { DddComponent, DddModule } from "../ddd-types";
import { walkFiles } from "./fs-utils";

/**
 * Load DDD module models from `*.ddd.yaml` files. v1 reads the curated fixtures
 * under `content/ddd/` plus any co-located models under `apps/api/src/modules/`.
 * Resilient: a malformed file is warned and skipped, never aborts the build.
 */
export function loadDddModules(contentDir: string, repoRoot: string): DddModule[] {
  const files = [
    ...walkFiles(join(contentDir, "ddd")),
    ...walkFiles(join(repoRoot, "apps", "api", "src", "modules")),
  ].filter((f) => f.endsWith(".ddd.yaml"));

  const byModule = new Map<string, DddModule>();
  for (const file of files) {
    const mod = parseDddFile(file);
    if (mod) byModule.set(mod.module, mod); // later (co-located) wins over fixture
  }
  return [...byModule.values()].sort((a, b) => a.module.localeCompare(b.module));
}

function parseDddFile(file: string): DddModule | null {
  try {
    const raw = parse(readFileSync(file, "utf8")) as Partial<DddModule> | null;
    if (!raw || typeof raw !== "object" || !raw.module) {
      console.warn(`[system-board] skipping ${file}: missing "module"`);
      return null;
    }
    const components = Array.isArray(raw.components) ? (raw.components as DddComponent[]) : [];
    return {
      module: raw.module,
      type: raw.type ?? "ddd",
      context: raw.context,
      tagline: raw.tagline,
      status: raw.status,
      readiness: raw.readiness,
      language: raw.language ?? [],
      components,
      ports: raw.ports ?? {},
      process: raw.process ?? [],
      externalSystems: raw.externalSystems ?? [],
    };
  } catch (err) {
    console.warn(`[system-board] skipping ${file}: ${(err as Error).message}`);
    return null;
  }
}
