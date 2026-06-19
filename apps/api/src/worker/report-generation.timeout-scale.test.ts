import { describe, expect, it } from "vitest";
import { resolveNodeTimeoutScale } from "./report-generation.graph";

describe("resolveNodeTimeoutScale", () => {
  it("uses a positive numeric override", () => {
    expect(resolveNodeTimeoutScale("6")).toBe(6);
    expect(resolveNodeTimeoutScale("2.5")).toBe(2.5);
  });

  it("falls back to 1 when unset", () => {
    expect(resolveNodeTimeoutScale(undefined)).toBe(1);
    expect(resolveNodeTimeoutScale("")).toBe(1);
  });

  it("falls back to 1 for non-positive or non-numeric values", () => {
    expect(resolveNodeTimeoutScale("0")).toBe(1);
    expect(resolveNodeTimeoutScale("-3")).toBe(1);
    expect(resolveNodeTimeoutScale("abc")).toBe(1);
  });
});
