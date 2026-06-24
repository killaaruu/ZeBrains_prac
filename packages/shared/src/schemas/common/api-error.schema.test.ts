import { describe, expect, it } from "vitest";
import { apiErrorSchema } from "./api-error.schema";

describe("apiErrorSchema", () => {
  it("accepts a single-string message error", () => {
    const error = { statusCode: 404, message: "Not Found", error: "Not Found" };
    expect(apiErrorSchema.parse(error)).toEqual(error);
  });

  it("accepts an array-of-strings message (validation errors)", () => {
    const error = {
      statusCode: 400,
      message: ["name must not be empty", "email must be an email"],
    };
    expect(apiErrorSchema.parse(error)).toEqual(error);
  });

  it("treats the error field as optional", () => {
    expect(apiErrorSchema.parse({ statusCode: 500, message: "Internal Server Error" })).toEqual({
      statusCode: 500,
      message: "Internal Server Error",
    });
  });

  it("requires a statusCode", () => {
    expect(() => apiErrorSchema.parse({ message: "boom" })).toThrow();
  });

  it("rejects a non-integer statusCode", () => {
    expect(() => apiErrorSchema.parse({ statusCode: 200.5, message: "boom" })).toThrow();
  });

  it("rejects a missing message", () => {
    expect(() => apiErrorSchema.parse({ statusCode: 400 })).toThrow();
  });

  it("rejects a message that is neither string nor string array", () => {
    expect(() => apiErrorSchema.parse({ statusCode: 400, message: 123 })).toThrow();
    expect(() => apiErrorSchema.parse({ statusCode: 400, message: [1, 2] })).toThrow();
  });
});
