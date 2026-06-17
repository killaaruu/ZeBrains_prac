import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { parseHash, useHashRoute } from "./use-hash-route";

describe("parseHash", () => {
  it("parses known routes", () => {
    expect(parseHash("#/modules")).toEqual({ name: "modules" });
    expect(parseHash("#/module/dataos/sync")).toEqual({ name: "module", id: "dataos/sync" });
  });
  it("defaults to DDD index for empty/unknown hash", () => {
    expect(parseHash("")).toEqual({ name: "ddd-index" });
    expect(parseHash("#/nonsense")).toEqual({ name: "ddd-index" });
  });
  it("falls back to DDD index when module id is empty", () => {
    expect(parseHash("#/module/")).toEqual({ name: "ddd-index" });
  });
  it("parses DDD routes", () => {
    expect(parseHash("#/ddd")).toEqual({ name: "ddd-index" });
    expect(parseHash("#/ddd/presale")).toEqual({ name: "ddd", id: "presale", tab: "overview" });
    expect(parseHash("#/ddd/presale/graph")).toEqual({ name: "ddd", id: "presale", tab: "graph" });
    expect(parseHash("#/ddd/presale/c/a-brief")).toEqual({
      name: "ddd-component",
      id: "presale",
      componentId: "a-brief",
    });
  });
  it("defaults unknown DDD tab to overview", () => {
    expect(parseHash("#/ddd/presale/bogus")).toEqual({
      name: "ddd",
      id: "presale",
      tab: "overview",
    });
  });
});

describe("useHashRoute", () => {
  afterEach(() => {
    window.location.hash = "";
  });
  it("tracks hash changes", () => {
    const { result } = renderHook(() => useHashRoute());
    act(() => {
      window.location.hash = "#/modules";
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    });
    expect(result.current).toEqual({ name: "modules" });
  });
});
