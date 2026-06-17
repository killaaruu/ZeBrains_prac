import { describe, expect, it } from "vitest";
import { exampleKeys } from "./keys";

describe("exampleKeys", () => {
  it("builds stable query keys", () => {
    expect(exampleKeys.all).toEqual(["example-entities"]);
    expect(exampleKeys.list({ limit: 10 })).toEqual(["example-entities", "list", { limit: 10 }]);
    expect(exampleKeys.detail("abc")).toEqual(["example-entities", "detail", "abc"]);
  });
});
