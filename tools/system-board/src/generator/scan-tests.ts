import { readFileSync } from "node:fs";
import { join } from "node:path";
import { walkFiles } from "./fs-utils";
import { LAYER_DIRS } from "./scan-modules";

const TEST_FILE = /\.(test|spec)\.tsx?$/;
const TEST_CALL = /\b(describe|it|test)\s*\(/g;

/** Count test files and describe/it/test calls across the product's layer dirs. */
export function scanTests(repoRoot: string, slugs: string[]): { files: number; total: number } {
  let files = 0;
  let total = 0;
  for (const layerDir of Object.values(LAYER_DIRS)) {
    for (const slug of slugs) {
      for (const path of walkFiles(join(repoRoot, layerDir, slug))) {
        if (!TEST_FILE.test(path)) continue;
        files += 1;
        const matches = readFileSync(path, "utf8").match(TEST_CALL);
        total += matches ? matches.length : 0;
      }
    }
  }
  return { files, total };
}
