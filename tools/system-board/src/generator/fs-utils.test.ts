import { mkdirSync, mkdtempSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { fileExists, listDir, walkFiles } from "./fs-utils";

describe("fs-utils", () => {
  let root: string;
  beforeAll(() => {
    root = mkdtempSync(join(tmpdir(), "fsutil-"));
    mkdirSync(join(root, "a", "b"), { recursive: true });
    writeFileSync(join(root, "a", "x.ts"), "x");
    writeFileSync(join(root, "a", "b", "y.ts"), "y");
  });

  it("listDir returns immediate entries with name, path and isDir", () => {
    const entries = listDir(join(root, "a"));
    const names = entries.map((e) => e.name).sort();
    expect(names).toEqual(["b", "x.ts"]);
    expect(entries.find((e) => e.name === "b")?.isDir).toBe(true);
    expect(entries.find((e) => e.name === "x.ts")?.path).toBe(join(root, "a", "x.ts"));
  });

  it("listDir returns [] for a missing directory", () => {
    expect(listDir(join(root, "nope"))).toEqual([]);
  });

  it("walkFiles returns all files recursively as absolute paths", () => {
    const files = walkFiles(join(root, "a")).sort();
    expect(files).toEqual([join(root, "a", "b", "y.ts"), join(root, "a", "x.ts")]);
  });

  it("fileExists reflects presence", () => {
    expect(fileExists(join(root, "a", "x.ts"))).toBe(true);
    expect(fileExists(join(root, "a", "nope.ts"))).toBe(false);
  });

  it("walkFiles does not follow symlinks (no infinite recursion)", () => {
    const s = mkdtempSync(join(tmpdir(), "fsutil-sym-"));
    mkdirSync(join(s, "sub"));
    writeFileSync(join(s, "sub", "real.ts"), "real");
    // sibling dir with a file that should NOT be visited via symlink
    const sibling = mkdtempSync(join(tmpdir(), "fsutil-sib-"));
    writeFileSync(join(sibling, "hidden.ts"), "hidden");
    symlinkSync(sibling, join(s, "sub", "link"), "dir");

    const files = walkFiles(join(s, "sub"));
    // must terminate and return exactly the one real file, not the symlinked one
    expect(files).toEqual([join(s, "sub", "real.ts")]);
  });
});
