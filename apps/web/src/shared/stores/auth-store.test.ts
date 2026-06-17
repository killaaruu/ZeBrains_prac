import { beforeEach, describe, expect, it, vi } from "vitest";

const mockHttp = {
  defaults: { headers: { common: {} as Record<string, string | undefined> } },
  get: vi.fn(),
};

vi.mock("@/shared/lib/api-client", () => ({ http: mockHttp }));

const mockAuthService = {
  getUser: vi.fn(),
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(),
  signOut: vi.fn(),
};
vi.mock("@/shared/lib/supabase", () => ({ authService: mockAuthService }));

describe("useAuthStore", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHttp.defaults.headers.common = {};
    mockHttp.get = vi.fn();
    vi.resetModules();

    vi.mock("@/shared/lib/api-client", () => ({ http: mockHttp }));
    vi.mock("@/shared/lib/supabase", () => ({ authService: mockAuthService }));
  });

  it("sets Authorization header when a session token is present on initialize", async () => {
    mockAuthService.getUser.mockResolvedValue({ id: "u1", email: "a@b.com" });
    mockAuthService.getSession.mockResolvedValue({ accessToken: "tok123" });
    mockAuthService.onAuthStateChange.mockReturnValue(() => {});

    const { useAuthStore } = await import("./auth-store");
    await useAuthStore.getState().initialize();

    expect(mockHttp.defaults.headers.common.Authorization).toBe("Bearer tok123");
  });

  it("clears Authorization header on signOut", async () => {
    mockHttp.defaults.headers.common.Authorization = "Bearer old-token";
    mockAuthService.signOut.mockResolvedValue(undefined);

    const { useAuthStore } = await import("./auth-store");
    await useAuthStore.getState().signOut();

    expect(mockHttp.defaults.headers.common.Authorization).toBeUndefined();
  });

  it("fetches user role from API after Supabase auth and stores it", async () => {
    mockAuthService.getUser.mockResolvedValue({ id: "u1", email: "a@b.com" });
    mockAuthService.getSession.mockResolvedValue({ accessToken: "tok123" });
    mockAuthService.onAuthStateChange.mockReturnValue(() => {});
    mockHttp.get.mockResolvedValue({
      data: {
        id: "u1",
        email: "a@b.com",
        firstName: "Test",
        lastName: "User",
        role: "admin",
        status: "active",
      },
    });

    const { useAuthStore } = await import("./auth-store");
    await useAuthStore.getState().initialize();

    expect(useAuthStore.getState().role).toBe("admin");
  });

  it("defaults role to 'user' when API call fails", async () => {
    mockAuthService.getUser.mockResolvedValue({ id: "u1", email: "a@b.com" });
    mockAuthService.getSession.mockResolvedValue({ accessToken: "tok123" });
    mockAuthService.onAuthStateChange.mockReturnValue(() => {});
    mockHttp.get.mockRejectedValue(new Error("Network error"));

    const { useAuthStore } = await import("./auth-store");
    await useAuthStore.getState().initialize();

    expect(useAuthStore.getState().role).toBe("user");
  });

  it("resets role on sign out", async () => {
    mockAuthService.signOut.mockResolvedValue(undefined);

    const { useAuthStore } = await import("./auth-store");
    useAuthStore.setState({ role: "admin" });
    await useAuthStore.getState().signOut();

    expect(useAuthStore.getState().role).toBeNull();
  });

  it("marks store as initialized after initialize() completes", async () => {
    mockAuthService.getUser.mockResolvedValue(null);
    mockAuthService.getSession.mockResolvedValue(null);
    mockAuthService.onAuthStateChange.mockReturnValue(() => {});

    const { useAuthStore } = await import("./auth-store");
    await useAuthStore.getState().initialize();

    expect(useAuthStore.getState().isInitialized).toBe(true);
    expect(useAuthStore.getState().isLoading).toBe(false);
  });
});
