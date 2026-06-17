import { describe, expect, it } from "vitest";
import { shouldSkipStartupMigrations } from "./migration-gate";

describe("shouldSkipStartupMigrations", () => {
  it("returns false by default so dev, prod, and full local still migrate on boot", () => {
    expect(shouldSkipStartupMigrations({})).toBe(false);
  });

  it('returns true only when API_SKIP_MIGRATIONS is exactly "true"', () => {
    expect(shouldSkipStartupMigrations({ API_SKIP_MIGRATIONS: "true" })).toBe(true);
  });

  it('returns false for any non-"true" value', () => {
    expect(shouldSkipStartupMigrations({ API_SKIP_MIGRATIONS: "1" })).toBe(false);
    expect(shouldSkipStartupMigrations({ API_SKIP_MIGRATIONS: "false" })).toBe(false);
    expect(shouldSkipStartupMigrations({ API_SKIP_MIGRATIONS: "" })).toBe(false);
  });
});
