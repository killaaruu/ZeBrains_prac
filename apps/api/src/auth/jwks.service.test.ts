import { generateKeyPairSync } from "node:crypto";
import { sign } from "jsonwebtoken";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGetSigningKey = vi.fn();

vi.mock("jwks-rsa", () => ({
  JwksClient: class {
    getSigningKey = mockGetSigningKey;
  },
}));

describe("JwksService", () => {
  beforeEach(() => {
    vi.resetModules();
    mockGetSigningKey.mockReset();
  });

  it("returns null when SUPABASE_URL is not configured", async () => {
    const { JwksService } = await import("./jwks.service");
    const service = new JwksService({ get: () => undefined } as never);
    const result = await service.getSigningKey("some-token");
    expect(result).toBeNull();
  });

  it("returns null for tokens without kid header", async () => {
    const { JwksService } = await import("./jwks.service");
    const token = sign({ sub: "user-id" }, "secret", { algorithm: "HS256" });
    const service = new JwksService({ get: () => "https://example.supabase.co" } as never);
    const result = await service.getSigningKey(token);
    expect(result).toBeNull();
  });

  it("returns public key for tokens with kid header", async () => {
    mockGetSigningKey.mockResolvedValue({ getPublicKey: () => "mock-public-key" });
    const { JwksService } = await import("./jwks.service");
    const token = sign({ sub: "user-id" }, "secret", {
      algorithm: "HS256",
      keyid: "test-kid",
    });
    const service = new JwksService({ get: () => "https://example.supabase.co" } as never);
    const result = await service.getSigningKey(token);
    expect(result).toBe("mock-public-key");
  });

  describe("verifyWithPublicKey", () => {
    it("verifies a valid ES256 token and returns the payload", async () => {
      const { JwksService } = await import("./jwks.service");
      const { privateKey, publicKey } = generateKeyPairSync("ec", { namedCurve: "prime256v1" });
      const pem = publicKey.export({ type: "spki", format: "pem" }) as string;
      const token = sign({ sub: "user-1" }, privateKey, { algorithm: "ES256" });

      const service = new JwksService({ get: () => undefined } as never);
      const result = service.verifyWithPublicKey(token, pem);

      expect(result).toMatchObject({ sub: "user-1" });
    });

    it("throws for an HMAC token verified against an EC public key", async () => {
      const { JwksService } = await import("./jwks.service");
      const { publicKey } = generateKeyPairSync("ec", { namedCurve: "prime256v1" });
      const pem = publicKey.export({ type: "spki", format: "pem" }) as string;
      const token = sign({ sub: "user-1" }, "hmac-secret", { algorithm: "HS256" });

      const service = new JwksService({ get: () => undefined } as never);
      expect(() => service.verifyWithPublicKey(token, pem)).toThrow();
    });
  });

  it("returns null when JWKS client throws", async () => {
    mockGetSigningKey.mockRejectedValue(new Error("key not found"));
    const { JwksService } = await import("./jwks.service");
    const token = sign({ sub: "user-id" }, "secret", {
      algorithm: "HS256",
      keyid: "unknown-kid",
    });
    const service = new JwksService({ get: () => "https://example.supabase.co" } as never);
    const result = await service.getSigningKey(token);
    expect(result).toBeNull();
  });
});
