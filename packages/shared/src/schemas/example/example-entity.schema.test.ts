import { describe, expect, it } from "vitest";
import {
  createExampleEntitySchema,
  exampleEntitySchema,
  updateExampleEntitySchema,
} from "./example-entity.schema";

describe("exampleEntitySchema", () => {
  const valid = {
    id: "00000000-0000-4000-8000-000000000000",
    name: "Demo",
    description: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };

  it("accepts a well-formed entity", () => {
    expect(exampleEntitySchema.parse(valid)).toEqual(valid);
  });

  it("rejects an empty name", () => {
    expect(() => exampleEntitySchema.parse({ ...valid, name: "" })).toThrow();
  });

  it("rejects a non-uuid id", () => {
    expect(() => exampleEntitySchema.parse({ ...valid, id: "nope" })).toThrow();
  });
});

describe("createExampleEntitySchema", () => {
  it("requires a name and allows an optional description", () => {
    expect(createExampleEntitySchema.parse({ name: "Demo" })).toEqual({ name: "Demo" });
    expect(createExampleEntitySchema.parse({ name: "Demo", description: "x" })).toEqual({
      name: "Demo",
      description: "x",
    });
  });

  it("rejects a missing name", () => {
    expect(() => createExampleEntitySchema.parse({})).toThrow();
  });
});

describe("updateExampleEntitySchema", () => {
  it("allows partial updates", () => {
    expect(updateExampleEntitySchema.parse({})).toEqual({});
    expect(updateExampleEntitySchema.parse({ name: "Renamed" })).toEqual({ name: "Renamed" });
  });
});
