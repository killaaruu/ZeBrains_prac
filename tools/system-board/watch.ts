import { join } from "node:path";
import chokidar from "chokidar";
import { createServer } from "vite";
import { generate } from "./src/generator/index";

const repoRoot = join(import.meta.dirname, "..", "..");

function regenerate(reason: string): void {
  try {
    generate();
    console.log(`[system-board] regenerated (${reason})`);
  } catch (error) {
    console.error(`[system-board] generate failed:`, error);
  }
}

const watchPaths = [
  join(repoRoot, "apps/api/src/modules"),
  join(repoRoot, "apps/web/src/features"),
  join(repoRoot, "packages/shared/src/schemas"),
  join(repoRoot, "packages/db-backend/src/schema"),
  join(repoRoot, "docs"),
  join(import.meta.dirname, "content"),
];

regenerate("startup");

const watcher = chokidar.watch(watchPaths, { ignoreInitial: true, depth: 6 });
let timer: NodeJS.Timeout | undefined;
watcher.on("all", (_event, path) => {
  clearTimeout(timer);
  timer = setTimeout(() => regenerate(`change: ${path}`), 200);
});

const server = await createServer({ root: import.meta.dirname });
await server.listen();
server.printUrls();
