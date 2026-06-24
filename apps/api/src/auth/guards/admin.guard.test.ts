import { ForbiddenException } from "@nestjs/common";
import { describe, expect, it } from "vitest";
import { AdminGuard } from "./admin.guard";

function makeContext(user: unknown) {
  const request = { user };
  return {
    switchToHttp: () => ({ getRequest: () => request }),
  } as never;
}

describe("AdminGuard", () => {
  const guard = new AdminGuard();

  it("allows access for an admin user", () => {
    expect(guard.canActivate(makeContext({ id: "admin-1", role: "admin" }))).toBe(true);
  });

  it("throws ForbiddenException for a non-admin user", () => {
    expect(() => guard.canActivate(makeContext({ id: "user-1", role: "user" }))).toThrow(
      ForbiddenException,
    );
  });

  it("throws ForbiddenException when user is missing from the request", () => {
    expect(() => guard.canActivate(makeContext(undefined))).toThrow(ForbiddenException);
  });
});
