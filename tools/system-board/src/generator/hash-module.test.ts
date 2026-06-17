import { describe, expect, it } from "vitest";
import { diffHashes } from "./hash-module";

const entry = (hash: string) => ({ hash, updatedAt: "2026-01-01T00:00:00.000Z" });

describe("diffHashes", () => {
  it("classifies changed, added and removed files", () => {
    const current = { "a.ts": entry("aa"), "b.ts": entry("BB"), "c.ts": entry("cc") };
    const recorded = { "a.ts": entry("aa"), "b.ts": entry("bb"), "d.ts": entry("dd") };
    expect(diffHashes(current, recorded)).toEqual({
      changed: ["b.ts"], // hash differs
      added: ["c.ts"], // not in recorded
      removed: ["d.ts"], // in recorded, gone now
    });
  });

  it("reports no drift when hashes match", () => {
    const same = { "a.ts": entry("aa") };
    expect(diffHashes(same, { "a.ts": entry("aa") })).toEqual({
      changed: [],
      added: [],
      removed: [],
    });
  });
});
