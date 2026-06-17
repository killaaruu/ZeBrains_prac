import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildMap } from "./build-map";

const here = dirname(fileURLToPath(import.meta.url)); // tools/system-board/src/generator
const packageRoot = join(here, "..", ".."); // tools/system-board
const repoRoot = join(packageRoot, "..", ".."); // repo root
const contentDir = join(packageRoot, "content");
const outFile = join(packageRoot, "src", "system-map.generated.json");

export function generate(): void {
  const map = buildMap(repoRoot, contentDir);
  writeFileSync(outFile, `${JSON.stringify(map, null, 2)}\n`);
  console.log(
    `[system-board] wrote ${map.products.length} products, ${map.modules.length} modules, ${map.canvas.edges.length} edges -> ${outFile}`,
  );
}

const isDirectRun = process.argv[1] === fileURLToPath(import.meta.url);
if (isDirectRun) generate();
