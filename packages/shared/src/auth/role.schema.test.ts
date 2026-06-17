import { describe, expect, it } from "vitest";
import { ROLE_NAMES, roleNameSchema } from "./role.schema";

describe("ROLE_NAMES", () => {
  it("contains exactly user and admin", () => {
    expect(ROLE_NAMES).toEqual(["user", "admin"]);
  });
});

describe("roleNameSchema", () => {
  it("accepts valid roles", () => {
    expect(roleNameSchema.parse("user")).toBe("user");
    expect(roleNameSchema.parse("admin")).toBe("admin");
  });

  it("rejects unknown roles", () => {
    expect(() => roleNameSchema.parse("superuser")).toThrow();
    expect(() => roleNameSchema.parse("manager")).toThrow();
  });

  it("rejects uppercase variants (no silent transform)", () => {
    expect(() => roleNameSchema.parse("ADMIN")).toThrow();
    expect(() => roleNameSchema.parse("User")).toThrow();
  });
});
