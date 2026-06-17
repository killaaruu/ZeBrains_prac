import { ForbiddenException } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RolesGuard } from "./roles.guard";

function makeContext(user: unknown, metadata: { roles?: string[]; minRole?: string } = {}) {
  const request = { user };
  return {
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => ({}),
    getClass: () => ({}),
    _metadata: metadata,
  } as never;
}

describe("RolesGuard", () => {
  let guard: RolesGuard;
  let mockReflector: { getAllAndOverride: ReturnType<typeof vi.fn> };

  const adminUser = { role: "admin" as const, status: "active" };
  const regularUser = { role: "user" as const, status: "active" };

  beforeEach(() => {
    // By default: no roles required, no minRole
    mockReflector = {
      getAllAndOverride: vi.fn().mockReturnValue(undefined),
    };
    guard = new RolesGuard(mockReflector as never);
  });

  it("allows access when no role restrictions are set", () => {
    expect(guard.canActivate(makeContext(regularUser))).toBe(true);
  });

  it("allows admin access to @Roles('admin') route", () => {
    mockReflector.getAllAndOverride
      .mockReturnValueOnce(["admin"]) // ROLES_KEY
      .mockReturnValueOnce(undefined); // MIN_ROLE_KEY
    expect(guard.canActivate(makeContext(adminUser))).toBe(true);
  });

  it("blocks user access to @Roles('admin') route", () => {
    mockReflector.getAllAndOverride.mockReturnValueOnce(["admin"]).mockReturnValueOnce(undefined);
    expect(() => guard.canActivate(makeContext(regularUser))).toThrow(ForbiddenException);
  });

  it("allows admin access to @MinRole('user') route (hierarchy)", () => {
    mockReflector.getAllAndOverride
      .mockReturnValueOnce(undefined) // no exact roles
      .mockReturnValueOnce("user"); // minRole = user
    expect(guard.canActivate(makeContext(adminUser))).toBe(true);
  });

  it("blocks user access to @MinRole('admin') route", () => {
    mockReflector.getAllAndOverride.mockReturnValueOnce(undefined).mockReturnValueOnce("admin");
    expect(() => guard.canActivate(makeContext(regularUser))).toThrow(ForbiddenException);
  });

  it("throws ForbiddenException when user is missing from request", () => {
    mockReflector.getAllAndOverride.mockReturnValueOnce(["admin"]).mockReturnValueOnce(undefined);
    expect(() => guard.canActivate(makeContext(undefined))).toThrow(ForbiddenException);
  });
});
