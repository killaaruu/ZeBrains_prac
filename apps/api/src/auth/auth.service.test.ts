import { UnauthorizedException } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthService } from "./auth.service";

const mockProfile = {
  id: "00000000-0000-0000-0000-000000000001",
  authUid: "auth-uid-123",
  email: "test@example.com",
  firstName: "John",
  lastName: "Doe",
  role: "user" as const,
  status: "active" as const,
  lastLoginAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

function makeChain(result: unknown[]) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue(result),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue(result),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
  };
  return chain;
}

describe("AuthService.resolveUser", () => {
  let service: AuthService;
  let mockDb: ReturnType<typeof makeChain>;

  beforeEach(() => {
    mockDb = makeChain([mockProfile]);
    // Make the top-level db methods return the chain
    const db = {
      select: () => mockDb,
      insert: () => mockDb,
      update: () => mockDb,
    };
    service = new AuthService(db as never);
  });

  it("returns RequestUser for active profile", async () => {
    const user = await service.resolveUser("auth-uid-123");
    expect(user.email).toBe("test@example.com");
    expect(user.role).toBe("user");
    expect(user.firstName).toBe("John");
  });

  it("throws UnauthorizedException when profile not found", async () => {
    const db = { select: () => makeChain([]) };
    service = new AuthService(db as never);
    await expect(service.resolveUser("nonexistent")).rejects.toThrow(UnauthorizedException);
  });

  it("throws UnauthorizedException for inactive user", async () => {
    const db = {
      select: () => makeChain([{ ...mockProfile, status: "inactive" }]),
    };
    service = new AuthService(db as never);
    await expect(service.resolveUser("auth-uid-123")).rejects.toThrow(UnauthorizedException);
  });
});

describe("AuthService.createProfile", () => {
  it("creates a new profile when none exists", async () => {
    const newProfile = {
      ...mockProfile,
      role: "user" as const,
      status: "pending" as const,
    };
    // First select returns empty (no existing), then insert returns new profile
    let callCount = 0;
    const db = {
      select: () => makeChain(callCount++ === 0 ? [] : [newProfile]),
      insert: () => makeChain([newProfile]),
      update: () => makeChain([]),
    };
    const service = new AuthService(db as never);
    const user = await service.createProfile("auth-uid-new", "new@example.com", {
      firstName: "Jane",
      lastName: "Doe",
    });
    expect(user.status).toBe("pending");
    expect(user.role).toBe("user");
  });

  it("returns existing profile if already created (idempotent)", async () => {
    const db = {
      select: () => makeChain([mockProfile]),
      insert: () => makeChain([]),
      update: () => makeChain([]),
    };
    const service = new AuthService(db as never);
    const user = await service.createProfile("auth-uid-123", "test@example.com", {
      firstName: "John",
      lastName: "Doe",
    });
    expect(user.id).toBe(mockProfile.id);
  });

  it("returns concurrently created profile when insert hits a unique constraint", async () => {
    const duplicateKeyError = Object.assign(new Error("duplicate key value"), { code: "23505" });
    let selectCount = 0;
    const db = {
      select: () => makeChain(selectCount++ === 0 ? [] : [mockProfile]),
      insert: () => ({
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockRejectedValue(duplicateKeyError),
      }),
      update: () => makeChain([]),
    };
    const service = new AuthService(db as never);

    const user = await service.createProfile("auth-uid-123", "test@example.com", {
      firstName: "John",
      lastName: "Doe",
    });

    expect(user.id).toBe(mockProfile.id);
    expect(selectCount).toBe(2);
  });

  it("rethrows non-unique-constraint insert errors", async () => {
    const fatalError = Object.assign(new Error("connection lost"), { code: "08006" });
    const db = {
      select: () => makeChain([]),
      insert: () => ({
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockRejectedValue(fatalError),
      }),
      update: () => makeChain([]),
    };
    const service = new AuthService(db as never);

    await expect(
      service.createProfile("auth-uid-new", "new@example.com", {
        firstName: "Jane",
        lastName: "Doe",
      }),
    ).rejects.toThrow("connection lost");
  });
});

describe("AuthService.updateLastLogin", () => {
  it("issues an update scoped by authUid with a fresh lastLoginAt", async () => {
    const where = vi.fn().mockResolvedValue(undefined);
    const set = vi.fn((_payload: { lastLoginAt: Date }) => ({ where }));
    const update = vi.fn(() => ({ set }));
    const service = new AuthService({ update } as never);

    await service.updateLastLogin("auth-uid-123");

    expect(update).toHaveBeenCalledOnce();
    const setArg = set.mock.calls.at(0)?.[0];
    expect(setArg?.lastLoginAt).toBeInstanceOf(Date);
    expect(where).toHaveBeenCalledOnce();
  });
});

describe("AuthService.activateByEmail", () => {
  it("sets status to active scoped by email", async () => {
    const where = vi.fn().mockResolvedValue(undefined);
    const set = vi.fn(() => ({ where }));
    const update = vi.fn(() => ({ set }));
    const service = new AuthService({ update } as never);

    await service.activateByEmail("user@example.com");

    expect(update).toHaveBeenCalledOnce();
    expect(set).toHaveBeenCalledWith({ status: "active" });
    expect(where).toHaveBeenCalledOnce();
  });
});
