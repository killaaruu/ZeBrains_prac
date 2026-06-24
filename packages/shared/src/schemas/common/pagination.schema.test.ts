import { describe, expect, it } from "vitest";
import { z } from "zod";
import { paginatedSchema, paginationQuerySchema } from "./pagination.schema";

describe("paginationQuerySchema", () => {
  it("applies defaults when fields are omitted", () => {
    expect(paginationQuerySchema.parse({})).toEqual({ limit: 20, offset: 0 });
  });

  it("coerces numeric strings", () => {
    expect(paginationQuerySchema.parse({ limit: "50", offset: "10" })).toEqual({
      limit: 50,
      offset: 10,
    });
  });

  it("accepts the boundary values", () => {
    expect(paginationQuerySchema.parse({ limit: 1, offset: 0 })).toEqual({ limit: 1, offset: 0 });
    expect(paginationQuerySchema.parse({ limit: 100, offset: 0 })).toEqual({
      limit: 100,
      offset: 0,
    });
  });

  it("rejects a limit below 1", () => {
    expect(() => paginationQuerySchema.parse({ limit: 0 })).toThrow();
  });

  it("rejects a limit above 100", () => {
    expect(() => paginationQuerySchema.parse({ limit: 101 })).toThrow();
  });

  it("rejects a negative offset", () => {
    expect(() => paginationQuerySchema.parse({ offset: -1 })).toThrow();
  });

  it("rejects non-integer values", () => {
    expect(() => paginationQuerySchema.parse({ limit: 1.5 })).toThrow();
    expect(() => paginationQuerySchema.parse({ offset: 2.5 })).toThrow();
  });
});

describe("paginatedSchema", () => {
  const schema = paginatedSchema(z.string());

  it("accepts a well-formed paginated response", () => {
    expect(schema.parse({ items: ["a", "b"], total: 2 })).toEqual({ items: ["a", "b"], total: 2 });
  });

  it("accepts an empty page", () => {
    expect(schema.parse({ items: [], total: 0 })).toEqual({ items: [], total: 0 });
  });

  it("validates each item against the wrapped schema", () => {
    expect(() => schema.parse({ items: ["a", 1], total: 2 })).toThrow();
  });

  it("rejects a negative total", () => {
    expect(() => schema.parse({ items: [], total: -1 })).toThrow();
  });

  it("rejects a non-integer total", () => {
    expect(() => schema.parse({ items: [], total: 1.5 })).toThrow();
  });

  it("requires the items field", () => {
    expect(() => schema.parse({ total: 0 })).toThrow();
  });
});
