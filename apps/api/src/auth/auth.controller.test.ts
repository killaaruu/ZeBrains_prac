import { UnauthorizedException } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthController } from "./auth.controller";

describe("AuthController", () => {
  let controller: AuthController;
  let mockAuthService: {
    createProfile: ReturnType<typeof vi.fn>;
    resolveUser: ReturnType<typeof vi.fn>;
  };
  let mockJwtService: {
    verifyAsync: ReturnType<typeof vi.fn>;
    signAsync: ReturnType<typeof vi.fn>;
  };
  let mockConfigService: { get: ReturnType<typeof vi.fn> };
  let mockWebhookHandler: { handle: ReturnType<typeof vi.fn> };
  let mockJwksService: {
    getSigningKey: ReturnType<typeof vi.fn>;
    verifyWithPublicKey: ReturnType<typeof vi.fn>;
  };

  const mockProfile = {
    id: "profile-1",
    email: "test@example.com",
    firstName: "John",
    lastName: "Doe",
    role: "user" as const,
    status: "pending" as const,
  };

  beforeEach(() => {
    mockAuthService = {
      createProfile: vi.fn().mockResolvedValue(mockProfile),
      resolveUser: vi.fn().mockResolvedValue({ ...mockProfile, status: "active", role: "admin" }),
    };
    mockJwtService = {
      verifyAsync: vi.fn().mockResolvedValue({ sub: "auth-uid", email: "test@example.com" }),
      signAsync: vi.fn().mockResolvedValue("local-dev-access-token"),
    };
    mockConfigService = { get: vi.fn().mockReturnValue(undefined) };
    mockWebhookHandler = { handle: vi.fn() };
    mockJwksService = {
      getSigningKey: vi.fn().mockResolvedValue(null),
      verifyWithPublicKey: vi.fn().mockReturnValue({ sub: "auth-uid", email: "test@example.com" }),
    };
    controller = new AuthController(
      mockAuthService as never,
      mockJwtService as never,
      mockConfigService as never,
      mockWebhookHandler as never,
      mockJwksService as never,
    );
  });

  describe("localDevLogin", () => {
    it("issues a local JWT for the seeded local admin when local dev auth is enabled", async () => {
      mockConfigService.get.mockImplementation((key: string) => {
        const values: Record<string, string> = {
          LOCAL_DEV_AUTH_ENABLED: "true",
          LOCAL_DEV_ADMIN_EMAIL: "admin@mad-os.local",
          LOCAL_DEV_ADMIN_PASSWORD: "MadOSLocalAdmin123!",
          LOCAL_DEV_ADMIN_AUTH_UID: "00000000-0000-4000-8000-000000000001",
          SUPABASE_JWT_SECRET: "local-dev-secret",
        };
        return values[key];
      });

      const result = await controller.localDevLogin({
        email: "admin@mad-os.local",
        password: "MadOSLocalAdmin123!",
      });

      expect(mockJwtService.signAsync).toHaveBeenCalledWith(
        { sub: "00000000-0000-4000-8000-000000000001", email: "admin@mad-os.local" },
        { secret: "local-dev-secret", expiresIn: "7d" },
      );
      expect(mockAuthService.resolveUser).toHaveBeenCalledWith(
        "00000000-0000-4000-8000-000000000001",
      );
      expect(result.accessToken).toBe("local-dev-access-token");
      expect(result.user.role).toBe("admin");
    });

    it("rejects local dev login when disabled", async () => {
      mockConfigService.get.mockReturnValue(undefined);

      await expect(
        controller.localDevLogin({
          email: "admin@mad-os.local",
          password: "MadOSLocalAdmin123!",
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe("register", () => {
    it("throws UnauthorizedException when no token provided", async () => {
      await expect(controller.register("", { firstName: "John", lastName: "Doe" })).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it("creates profile with HMAC-verified token", async () => {
      mockConfigService.get.mockReturnValue("hmac-secret");

      const result = await controller.register("Bearer valid-token", {
        firstName: "John",
        lastName: "Doe",
      });

      expect(mockJwtService.verifyAsync).toHaveBeenCalledWith("valid-token", {
        secret: "hmac-secret",
      });
      expect(mockAuthService.createProfile).toHaveBeenCalledWith("auth-uid", "test@example.com", {
        firstName: "John",
        lastName: "Doe",
      });
      expect(result).toEqual(mockProfile);
    });

    it("falls back to JWKS verification when HMAC fails", async () => {
      mockJwtService.verifyAsync.mockRejectedValueOnce(new Error("invalid signature"));
      mockJwksService.getSigningKey.mockResolvedValue("es256-public-key");

      const result = await controller.register("Bearer es256-token", {
        firstName: "John",
        lastName: "Doe",
      });

      expect(mockJwksService.getSigningKey).toHaveBeenCalledWith("es256-token");
      // JWKS verification must NOT use jwtService (module-level secret conflicts with ES256)
      expect(mockJwtService.verifyAsync).toHaveBeenCalledTimes(1);
      expect(mockJwksService.verifyWithPublicKey).toHaveBeenCalledWith(
        "es256-token",
        "es256-public-key",
      );
      expect(result).toEqual(mockProfile);
    });

    it("throws UnauthorizedException when both HMAC and JWKS fail", async () => {
      mockJwtService.verifyAsync.mockRejectedValue(new Error("invalid"));
      mockJwksService.getSigningKey.mockResolvedValue(null);

      await expect(
        controller.register("Bearer bad-token", { firstName: "John", lastName: "Doe" }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
