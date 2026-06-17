/**
 * Deterministic drift detector for the DDD-doc skill (the "backend" mechanics).
 *
 * Walks a module's source files, hashes each, and compares against the recorded
 * `<module>.hashes.yaml`. A changed hash is NOT a claim that docs are wrong — it
 * is a "re-read this" trigger for the LLM (see the spec). Pure + deterministic:
 * no LLM, no network.
 *
 *   tsx src/generator/hash-module.ts <dir-relative-to-repo> [--write]
 *
 * Without --write: prints a drift report and exits 1 if drift is found (so it can
 * gate the skill). With --write: rewrites `<module>.hashes.yaml` to current state.
 */
import { createHash } from "node:crypto";
import { existsSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { parse, stringify } from "yaml";
import { walkFiles } from "./fs-utils";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, "..", "..", "..", "..");

type FileEntry = { hash: string; updatedAt: string };
type HashesFile = { module: string; generatedAt: string; files: Record<string, FileEntry> };
export type Drift = { changed: string[]; added: string[]; removed: string[] };

const SOURCE_RE = /\.(ts|tsx)$/;
const IGNORE_RE = /\.(test|spec)\.(ts|tsx)$|\.ddd\.yaml$|\.hashes\.yaml$/;

function hashContent(text: string): string {
  return createHash("sha256").update(text).digest("hex").slice(0, 12);
}

/** Current source files of a module dir → { repo-relative path: entry }. */
export function scanHashes(absDir: string): Record<string, FileEntry> {
  const out: Record<string, FileEntry> = {};
  for (const abs of walkFiles(absDir)) {
    if (!SOURCE_RE.test(abs) || IGNORE_RE.test(abs)) continue;
    const rel = relative(repoRoot, abs);
    out[rel] = {
      hash: hashContent(readFileSync(abs, "utf8")),
      updatedAt: statSync(abs).mtime.toISOString(),
    };
  }
  return out;
}

export function diffHashes(
  current: Record<string, FileEntry>,
  recorded: Record<string, FileEntry>,
): Drift {
  const changed: string[] = [];
  const added: string[] = [];
  for (const [path, entry] of Object.entries(current)) {
    const rec = recorded[path];
    if (!rec) added.push(path);
    else if (rec.hash !== entry.hash) changed.push(path);
  }
  const removed = Object.keys(recorded).filter((p) => !(p in current));
  return { changed: changed.sort(), added: added.sort(), removed: removed.sort() };
}

function loadRecorded(file: string): Record<string, FileEntry> {
  if (!existsSync(file)) return {};
  const parsed = parse(readFileSync(file, "utf8")) as HashesFile | null;
  return parsed?.files ?? {};
}

function run(): void {
  const args = process.argv.slice(2);
  const write = args.includes("--write");
  const dirArg = args.find((a) => !a.startsWith("--"));
  if (!dirArg) {
    console.error("usage: tsx src/generator/hash-module.ts <dir-relative-to-repo> [--write]");
    process.exit(2);
  }
  const absDir = join(repoRoot, dirArg);
  if (!existsSync(absDir)) {
    console.error(`[hash-module] not found: ${dirArg}`);
    process.exit(2);
  }
  const moduleName = basename(dirArg);
  const hashesFile = join(absDir, `${moduleName}.hashes.yaml`);

  const current = scanHashes(absDir);
  const drift = diffHashes(current, loadRecorded(hashesFile));
  const count = drift.changed.length + drift.added.length + drift.removed.length;

  for (const p of drift.changed) console.log(`  ~ changed  ${p}`);
  for (const p of drift.added) console.log(`  + added    ${p}`);
  for (const p of drift.removed) console.log(`  - removed  ${p}`);
  console.log(
    `[hash-module] ${moduleName}: ${Object.keys(current).length} files, ${count} drifted`,
  );

  if (write) {
    const payload: HashesFile = {
      module: moduleName,
      generatedAt: new Date().toISOString(),
      files: Object.fromEntries(Object.entries(current).sort(([a], [b]) => a.localeCompare(b))),
    };
    writeFileSync(hashesFile, stringify(payload));
    console.log(`[hash-module] wrote ${relative(repoRoot, hashesFile)}`);
  } else if (count > 0) {
    process.exit(1); // drift present — gate for the skill
  }
}

const isDirectRun = process.argv[1] === fileURLToPath(import.meta.url);
if (isDirectRun) run();
