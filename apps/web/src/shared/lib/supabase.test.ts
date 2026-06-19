import { beforeEach, describe, expect, it, vi } from "vitest";

const mockLocalDevRealtimeService = vi.fn();
const mockSupabaseRealtimeService = vi.fn();
const mockLocalDevAuthService = vi.fn();
const mockSupabaseAuthService = vi.fn();

vi.mock("axios", () => {
  const mockInstance = {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    request: vi.fn(),
    defaults: { headers: { common: {} } },
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
  };

  return { default: { create: vi.fn(() => mockInstance) } };
});

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({ auth: {}, channel: vi.fn() })),
}));

vi.mock("@repo/services-client/auth", () => ({
  SupabaseAuthService: class {
    constructor(...args: unknown[]) {
      mockSupabaseAuthService(...args);
    }
  },
}));

vi.mock("@repo/services-client/realtime", () => ({
  SupabaseRealtimeService: class {
    constructor(...args: unknown[]) {
      mockSupabaseRealtimeService(...args);
    }
  },
}));

vi.mock("./local-dev-realtime-service", () => ({
  LocalDevRealtimeService: class {
    constructor(...args: unknown[]) {
      mockLocalDevRealtimeService(...args);
    }
  },
}));

vi.mock("./local-dev-auth-service", () => ({
  LocalDevAuthService: class {
    constructor(...args: unknown[]) {
      mockLocalDevAuthService(...args);
    }
  },
}));

describe("supabase local-dev bootstrap", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    import.meta.env.VITE_LOCAL_DEV_AUTH_ENABLED = "true";
    import.meta.env.VITE_SUPABASE_URL = "https://local-dev-placeholder.supabase.co";
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_local_dev_placeholder";
    import.meta.env.VITE_API_URL = "http://127.0.0.1:31016";
  });

  it("initializes authService without throwing in local-dev mode", async () => {
    await expect(import("./supabase")).resolves.toMatchObject({
      authService: expect.any(Object),
      realtimeService: expect.any(Object),
      supabase: expect.any(Object),
    });
  });

  it("uses local-dev auth without starting a Supabase realtime client", async () => {
    await import("./supabase");

    expect(mockLocalDevAuthService).toHaveBeenCalledTimes(1);
    expect(mockSupabaseAuthService).not.toHaveBeenCalled();
    expect(mockSupabaseRealtimeService).not.toHaveBeenCalled();
    expect(mockLocalDevRealtimeService).toHaveBeenCalledTimes(1);
  });
});
