import { existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

export type DirEntry = { name: string; path: string; isDir: boolean };

/** Immediate children of `dir`. Returns [] if the directory is missing. */
export function listDir(dir: string): DirEntry[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).map((d) => ({
    name: d.name,
    path: join(dir, d.name),
    isDir: d.isDirectory(),
  }));
}

/** All files under `dir`, recursively, as absolute paths. Returns [] if missing. */
export function walkFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isSymbolicLink()) continue;
    if (entry.isDirectory()) out.push(...walkFiles(full));
    else out.push(full);
  }
  return out;
}

export function fileExists(path: string): boolean {
  return existsSync(path) && statSync(path).isFile();
}
