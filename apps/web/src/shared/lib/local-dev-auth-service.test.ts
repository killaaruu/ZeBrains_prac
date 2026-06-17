import { beforeEach, describe, expect, it, vi } from "vitest";
import { LocalDevAuthService } from "./local-dev-auth-service";

describe("LocalDevAuthService", () => {
  const storage = new Map<string, string>();
  const apiClient = {
    post: vi.fn(),
  };

  beforeEach(() => {
    storage.clear();
    apiClient.post.mockReset();
  });

  it("signs in through the local dev API and persists the returned session", async () => {
    apiClient.post.mockResolvedValue({
      accessToken: "access-token",
      refreshToken: "refresh-token",
      expiresAt: 123,
      user: { id: "profile-1", email: "admin@mad-os.local" },
    });

    const service = new LocalDevAuthService(apiClient, {
      getItem: (key) => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, value),
      removeItem: (key) => storage.delete(key),
    });

    const user = await service.signIn("admin@mad-os.local", "MadOSLocalAdmin123!");
    const session = await service.getSession();

    expect(apiClient.post).toHaveBeenCalledWith("/auth/local-dev-login", {
      email: "admin@mad-os.local",
      password: "MadOSLocalAdmin123!",
    });
    expect(user.email).toBe("admin@mad-os.local");
    expect(session?.accessToken).toBe("access-token");
  });
});
