import { UnauthorizedException } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthGuard } from "./auth.guard";

function makeContext(headers: Record<string, string> = {}) {
  const request = { headers, user: undefined as unknown };
  return {
    request,
    switchToHttp: () => ({
      getRequest: () => request,
    }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as never;
}

describe("AuthGuard", () => {
  let guard: AuthGuard;
  let mockJwtService: { verifyAsync: ReturnType<typeof vi.fn> };
  let mockConfigService: { get: ReturnType<typeof vi.fn> };
  let mockReflector: { getAllAndOverride: ReturnType<typeof vi.fn> };
  let mockAuthService: { resolveUser: ReturnType<typeof vi.fn> };
  let mockServiceTokenService: { resolve: ReturnType<typeof vi.fn> };
  let mockJwksService: {
    getSigningKey: ReturnType<typeof vi.fn>;
    verifyWithPublicKey: ReturnType<typeof vi.fn>;
  };

  const mockUser = {
    id: "00000000-0000-0000-0000-000000000001",
    email: "test@example.com",
    firstName: "John",
    lastName: "Doe",
    role: "user" as const,
    status: "active" as const,
  };

  beforeEach(() => {
    mockJwtService = { verifyAsync: vi.fn().mockResolvedValue({ sub: "auth-uid" }) };
    mockConfigService = { get: vi.fn().mockReturnValue("secret") };
    mockReflector = { getAllAndOverride: vi.fn().mockReturnValue(false) };
    mockAuthService = { resolveUser: vi.fn().mockResolvedValue(mockUser) };
    mockServiceTokenService = { resolve: vi.fn().mockReturnValue(null) };
    mockJwksService = {
      getSigningKey: vi.fn().mockResolvedValue(null),
      verifyWithPublicKey: vi.fn().mockReturnValue({ sub: "auth-uid" }),
    };
    guard = new AuthGuard(
      mockJwtService as never,
      mockConfigService as never,
      mockReflector as never,
      mockAuthService as never,
      mockServiceTokenService as never,
      mockJwksService as never,
    );
  });

  it("bypasses auth for @Public() routes", async () => {
    mockReflector.getAllAndOverride.mockReturnValue(true);
    const result = await guard.canActivate(makeContext());
    expect(result).toBe(true);
    expect(mockJwtService.verifyAsync).not.toHaveBeenCalled();
  });

  it("throws UnauthorizedException when no token is provided", async () => {
    await expect(guard.canActivate(makeContext())).rejects.toThrow(UnauthorizedException);
  });

  it("throws UnauthorizedException for invalid token", async () => {
    mockJwtService.verifyAsync.mockRejectedValue(new Error("invalid"));
    await expect(
      guard.canActivate(makeContext({ authorization: "Bearer bad-token" })),
    ).rejects.toThrow(UnauthorizedException);
  });

  it("tries JWKS verification when HMAC secret verification fails", async () => {
    mockJwtService.verifyAsync.mockRejectedValueOnce(new Error("invalid signature"));
    mockJwksService.getSigningKey.mockResolvedValue("es256-public-key");

    const ctx = makeContext({ authorization: "Bearer es256-token" });
    const result = await guard.canActivate(ctx);

    expect(result).toBe(true);
    expect(mockJwksService.getSigningKey).toHaveBeenCalledWith("es256-token");
    // JWKS verification must NOT use jwtService (module-level secret conflicts with ES256)
    expect(mockJwtService.verifyAsync).toHaveBeenCalledTimes(1);
    expect(mockJwksService.verifyWithPublicKey).toHaveBeenCalledWith(
      "es256-token",
      "es256-public-key",
    );
  });

  it("skips JWKS verification when no JWKS service is configured", async () => {
    const guardNoJwks = new AuthGuard(
      mockJwtService as never,
      mockConfigService as never,
      mockReflector as never,
      mockAuthService as never,
      mockServiceTokenService as never,
      null as never,
    );
    mockJwtService.verifyAsync.mockRejectedValue(new Error("invalid"));

    await expect(
      guardNoJwks.canActivate(makeContext({ authorization: "Bearer bad-token" })),
    ).rejects.toThrow(UnauthorizedException);
  });

  it("attaches user to request on valid token", async () => {
    const ctx = makeContext({ authorization: "Bearer valid-token" });
    const result = await guard.canActivate(ctx);
    expect(result).toBe(true);
    expect(mockAuthService.resolveUser).toHaveBeenCalledWith("auth-uid");
  });

  it("re-throws UnauthorizedException from AuthService (e.g. inactive account)", async () => {
    mockAuthService.resolveUser.mockRejectedValue(new UnauthorizedException("Account is inactive"));
    await expect(
      guard.canActivate(makeContext({ authorization: "Bearer valid-token" })),
    ).rejects.toThrow(UnauthorizedException);
  });

  describe("service token auth", () => {
    const mockServiceUser = {
      id: "service:analytics",
      module: "analytics",
      role: "reader",
      isServiceToken: true as const,
    };

    it("accepts valid service token when JWT verification fails", async () => {
      mockJwtService.verifyAsync.mockRejectedValue(new Error("invalid jwt"));
      mockServiceTokenService.resolve.mockReturnValue(mockServiceUser);

      const ctx = makeContext({ authorization: "Bearer tok_analytics" });
      const result = await guard.canActivate(ctx);

      expect(result).toBe(true);
      expect(mockServiceTokenService.resolve).toHaveBeenCalledWith("tok_analytics");
    });

    it("attaches service user to request for service tokens", async () => {
      mockJwtService.verifyAsync.mockRejectedValue(new Error("invalid jwt"));
      mockServiceTokenService.resolve.mockReturnValue(mockServiceUser);

      const ctx = makeContext({ authorization: "Bearer tok_analytics" });
      await guard.canActivate(ctx);

      const request = (ctx as { request: { user: unknown } }).request;
      expect(request.user).toEqual(mockServiceUser);
    });

    it("throws UnauthorizedException when neither JWT nor service token is valid", async () => {
      mockJwtService.verifyAsync.mockRejectedValue(new Error("invalid jwt"));
      mockServiceTokenService.resolve.mockReturnValue(null);

      await expect(
        guard.canActivate(makeContext({ authorization: "Bearer unknown-token" })),
      ).rejects.toThrow(UnauthorizedException);
    });

    it("prefers JWT auth when JWT is valid (does not try service token)", async () => {
      const ctx = makeContext({ authorization: "Bearer valid-jwt" });
      await guard.canActivate(ctx);

      expect(mockServiceTokenService.resolve).not.toHaveBeenCalled();
    });
  });
});
