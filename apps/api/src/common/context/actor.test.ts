import type { RequestUser } from "@repo/shared";
import type { Request } from "express";
import { describe, expect, it } from "vitest";
import { extractIp, resolveActor } from "./actor";

const mockReq = (overrides: Partial<Request> = {}): Request =>
  ({
    headers: {},
    ip: undefined,
    ...overrides,
  }) as unknown as Request;

describe("resolveActor", () => {
  it("returns admin actor for an authenticated user with email", () => {
    const req = mockReq({
      user: {
        id: "22222222-2222-2222-2222-222222222222",
        email: "ops@example.com",
        firstName: "Ops",
        lastName: "Admin",
        role: "admin",
        status: "active",
      } as unknown as RequestUser,
    });

    const actor = resolveActor(req);

    expect(actor).toEqual({
      kind: "admin",
      id: "22222222-2222-2222-2222-222222222222",
      label: "ops@example.com",
    });
  });

  it("falls back to firstName + lastName when email is missing", () => {
    const req = mockReq({
      user: {
        id: "33333333-3333-3333-3333-333333333333",
        firstName: "Jane",
        lastName: "Doe",
        role: "user",
      } as unknown as RequestUser,
    });

    const actor = resolveActor(req);

    expect(actor).toEqual({
      kind: "admin",
      id: "33333333-3333-3333-3333-333333333333",
      label: "Jane Doe",
    });
  });

  it("returns system actor when no user is attached to request", () => {
    const req = mockReq();

    const actor = resolveActor(req);

    expect(actor).toEqual({
      kind: "system",
      id: null,
      label: "system",
    });
  });
});

describe("extractIp", () => {
  it("uses first IP from x-forwarded-for chain", () => {
    const req = mockReq({
      headers: { "x-forwarded-for": "203.0.113.7, 10.0.0.1, 10.0.0.2" },
      ip: "127.0.0.1",
    });

    expect(extractIp(req)).toBe("203.0.113.7");
  });

  it("falls back to req.ip when x-forwarded-for missing", () => {
    const req = mockReq({ ip: "192.168.1.5" });
    expect(extractIp(req)).toBe("192.168.1.5");
  });

  it("returns null when neither is present", () => {
    expect(extractIp(mockReq())).toBeNull();
  });

  it("handles array x-forwarded-for header", () => {
    const req = mockReq({
      headers: { "x-forwarded-for": ["203.0.113.7"] as unknown as string },
    });
    expect(extractIp(req)).toBe("203.0.113.7");
  });
});
