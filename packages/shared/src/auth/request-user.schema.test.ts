import { describe, expect, it } from "vitest";
import { requestUserSchema, USER_STATUSES } from "./request-user.schema";

const validUser = {
  id: "00000000-0000-0000-0000-000000000001",
  email: "test@example.com",
  firstName: "John",
  lastName: "Doe",
  role: "user",
  status: "active",
} as const;

describe("USER_STATUSES", () => {
  it("contains pending, active, inactive", () => {
    expect(USER_STATUSES).toEqual(["pending", "active", "inactive"]);
  });
});

describe("requestUserSchema", () => {
  it("parses a valid user", () => {
    expect(requestUserSchema.parse(validUser)).toEqual(validUser);
  });

  it("rejects invalid role", () => {
    expect(() => requestUserSchema.parse({ ...validUser, role: "god" })).toThrow();
  });

  it("rejects invalid status", () => {
    expect(() => requestUserSchema.parse({ ...validUser, status: "banned" })).toThrow();
  });

  it("rejects malformed email", () => {
    expect(() => requestUserSchema.parse({ ...validUser, email: "not-an-email" })).toThrow();
  });

  it("rejects non-uuid id", () => {
    expect(() => requestUserSchema.parse({ ...validUser, id: "123" })).toThrow();
  });
});
