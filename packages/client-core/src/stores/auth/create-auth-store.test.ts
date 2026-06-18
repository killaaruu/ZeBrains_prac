import type {
  AuthEvent,
  AuthSession,
  AuthUser,
  IAuthService,
  Unsubscribe,
} from "@repo/services-client/auth";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createAuthStore } from "./create-auth-store";

function createMocks() {
  return {
    getUser: vi.fn(),
    getSession: vi.fn(),
    onAuthStateChange: vi.fn().mockReturnValue(() => {}),
    signOut: vi.fn(),
    signIn: vi.fn(),
    signUp: vi.fn(),
    signInWithOAuth: vi.fn(),
    resetPassword: vi.fn(),
  };
}

describe("createAuthStore", () => {
  let mocks: ReturnType<typeof createMocks>;
  let authService: IAuthService;

  beforeEach(() => {
    mocks = createMocks();
    authService = mocks as unknown as IAuthService;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("starts with null user and isLoading=true", () => {
    const useStore = createAuthStore({ authService });
    const state = useStore.getState();
    expect(state.user).toBeNull();
    expect(state.role).toBeNull();
    expect(state.isLoading).toBe(true);
    expect(state.isInitialized).toBe(false);
  });

  it("loads user and session on initialize", async () => {
    const user: AuthUser = { id: "u1", email: "a@b.com" };
    const session: AuthSession = {
      accessToken: "tok",
      refreshToken: "ref",
      expiresAt: 0,
      user,
    };
    mocks.getUser.mockResolvedValue(user);
    mocks.getSession.mockResolvedValue(session);

    const useStore = createAuthStore({ authService });
    await useStore.getState().initialize();

    const state = useStore.getState();
    expect(state.user).toEqual(user);
    expect(state.isLoading).toBe(false);
    expect(state.isInitialized).toBe(true);
  });

  it("calls onTokenChange with access token after initialize", async () => {
    const onTokenChange = vi.fn();
    const session: AuthSession = {
      accessToken: "tok123",
      refreshToken: "r",
      expiresAt: 0,
      user: { id: "u1", email: "a@b.com" },
    };
    mocks.getUser.mockResolvedValue(session.user);
    mocks.getSession.mockResolvedValue(session);

    const useStore = createAuthStore({ authService, onTokenChange });
    await useStore.getState().initialize();

    expect(onTokenChange).toHaveBeenCalledWith("tok123");
  });

  it("calls onTokenChange(null) when no session on initialize", async () => {
    const onTokenChange = vi.fn();
    mocks.getUser.mockResolvedValue(null);
    mocks.getSession.mockResolvedValue(null);

    const useStore = createAuthStore({ authService, onTokenChange });
    await useStore.getState().initialize();

    expect(onTokenChange).toHaveBeenCalledWith(null);
  });

  it("fetches and stores role when fetchRole is provided and user is authenticated", async () => {
    const fetchRole = vi.fn().mockResolvedValue("admin");
    const session: AuthSession = {
      accessToken: "tok",
      refreshToken: "r",
      expiresAt: 0,
      user: { id: "u1", email: "a@b.com" },
    };
    mocks.getUser.mockResolvedValue(session.user);
    mocks.getSession.mockResolvedValue(session);

    const useStore = createAuthStore({ authService, fetchRole });
    await useStore.getState().initialize();

    expect(fetchRole).toHaveBeenCalled();
    expect(useStore.getState().role).toBe("admin");
  });

  it("does not call fetchRole when user is unauthenticated", async () => {
    const fetchRole = vi.fn().mockResolvedValue("admin");
    mocks.getUser.mockResolvedValue(null);
    mocks.getSession.mockResolvedValue(null);

    const useStore = createAuthStore({ authService, fetchRole });
    await useStore.getState().initialize();

    expect(fetchRole).not.toHaveBeenCalled();
    expect(useStore.getState().role).toBeNull();
  });

  it("leaves role null when fetchRole is not provided", async () => {
    const session: AuthSession = {
      accessToken: "tok",
      refreshToken: "r",
      expiresAt: 0,
      user: { id: "u1", email: "a@b.com" },
    };
    mocks.getUser.mockResolvedValue(session.user);
    mocks.getSession.mockResolvedValue(session);

    const useStore = createAuthStore({ authService });
    await useStore.getState().initialize();

    expect(useStore.getState().role).toBeNull();
  });

  it("subscribes to auth state changes on initialize", async () => {
    mocks.getUser.mockResolvedValue(null);
    mocks.getSession.mockResolvedValue(null);

    const useStore = createAuthStore({ authService });
    await useStore.getState().initialize();

    expect(mocks.onAuthStateChange).toHaveBeenCalledTimes(1);
  });

  it("updates user when auth state changes", async () => {
    let listener: ((e: AuthEvent, u: AuthUser | null, s: AuthSession | null) => void) | null = null;
    mocks.onAuthStateChange.mockImplementation((cb) => {
      listener = cb as typeof listener;
      return () => {};
    });
    mocks.getUser.mockResolvedValue(null);
    mocks.getSession.mockResolvedValue(null);

    const onTokenChange = vi.fn();
    const useStore = createAuthStore({ authService, onTokenChange });
    await useStore.getState().initialize();

    const newUser: AuthUser = { id: "u2", email: "x@y.com" };
    const newSession: AuthSession = {
      accessToken: "fresh",
      refreshToken: "r",
      expiresAt: 0,
      user: newUser,
    };
    await listener!("SIGNED_IN", newUser, newSession);

    expect(useStore.getState().user).toEqual(newUser);
    expect(onTokenChange).toHaveBeenLastCalledWith("fresh");
  });

  it("refreshes role when auth state changes to a signed-in user", async () => {
    let listener: ((e: AuthEvent, u: AuthUser | null, s: AuthSession | null) => void) | null = null;
    mocks.onAuthStateChange.mockImplementation((cb) => {
      listener = cb as typeof listener;
      return () => {};
    });
    mocks.getUser.mockResolvedValue(null);
    mocks.getSession.mockResolvedValue(null);

    const fetchRole = vi.fn().mockResolvedValue("admin");
    const useStore = createAuthStore({ authService, fetchRole });
    await useStore.getState().initialize();

    const newUser: AuthUser = { id: "u2", email: "x@y.com" };
    const newSession: AuthSession = {
      accessToken: "fresh",
      refreshToken: "r",
      expiresAt: 0,
      user: newUser,
    };

    await listener!("SIGNED_IN", newUser, newSession);

    expect(fetchRole).toHaveBeenCalledTimes(1);
    expect(useStore.getState().role).toBe("admin");
  });

  it("clears role when auth state changes to signed out", async () => {
    let listener: ((e: AuthEvent, u: AuthUser | null, s: AuthSession | null) => void) | null = null;
    mocks.onAuthStateChange.mockImplementation((cb) => {
      listener = cb as typeof listener;
      return () => {};
    });
    mocks.getUser.mockResolvedValue(null);
    mocks.getSession.mockResolvedValue(null);

    const useStore = createAuthStore({ authService });
    useStore.setState({ role: "admin" });
    await useStore.getState().initialize();

    await listener!("SIGNED_OUT", null, null);

    expect(useStore.getState().user).toBeNull();
    expect(useStore.getState().role).toBeNull();
  });

  it("does not initialize twice", async () => {
    mocks.getUser.mockResolvedValue(null);
    mocks.getSession.mockResolvedValue(null);

    const useStore = createAuthStore({ authService });
    await useStore.getState().initialize();
    await useStore.getState().initialize();

    expect(mocks.getUser).toHaveBeenCalledTimes(1);
  });

  it("setUser updates user state", () => {
    const useStore = createAuthStore({ authService });
    const user: AuthUser = { id: "u1", email: "a@b.com" };
    useStore.getState().setUser(user);
    expect(useStore.getState().user).toEqual(user);
  });

  it("signOut clears user, role, and token", async () => {
    const onTokenChange = vi.fn();
    mocks.signOut.mockResolvedValue(undefined);

    const useStore = createAuthStore({ authService, onTokenChange });
    useStore.setState({ user: { id: "u1", email: "a@b.com" }, role: "admin" });

    await useStore.getState().signOut();

    expect(useStore.getState().user).toBeNull();
    expect(useStore.getState().role).toBeNull();
    expect(onTokenChange).toHaveBeenCalledWith(null);
  });

  it("clears local user, role and token even when authService.signOut rejects", async () => {
    const onTokenChange = vi.fn();
    mocks.signOut.mockRejectedValue(new Error("network"));

    const useStore = createAuthStore({ authService, onTokenChange });
    useStore.setState({ user: { id: "u1", email: "a@b.com" }, role: "admin" });

    await expect(useStore.getState().signOut()).rejects.toThrow("network");

    expect(useStore.getState().user).toBeNull();
    expect(useStore.getState().role).toBeNull();
    expect(onTokenChange).toHaveBeenCalledWith(null);
  });

  it("cleanup unsubscribes from auth state changes", async () => {
    const unsubscribe: Unsubscribe = vi.fn();
    mocks.onAuthStateChange.mockReturnValue(unsubscribe);
    mocks.getUser.mockResolvedValue(null);
    mocks.getSession.mockResolvedValue(null);

    const useStore = createAuthStore({ authService });
    await useStore.getState().initialize();
    useStore.getState().cleanup();

    expect(unsubscribe).toHaveBeenCalled();
    expect(useStore.getState().isInitialized).toBe(false);
  });

  it("recovers gracefully when initialize throws", async () => {
    mocks.getUser.mockRejectedValue(new Error("network"));
    mocks.getSession.mockRejectedValue(new Error("network"));

    const useStore = createAuthStore({ authService });
    await useStore.getState().initialize();

    const state = useStore.getState();
    expect(state.user).toBeNull();
    expect(state.isLoading).toBe(false);
    expect(state.isInitialized).toBe(true);
  });

  it("falls back to null role when fetchRole throws", async () => {
    const fetchRole = vi.fn().mockRejectedValue(new Error("api down"));
    const session: AuthSession = {
      accessToken: "tok",
      refreshToken: "r",
      expiresAt: 0,
      user: { id: "u1", email: "a@b.com" },
    };
    mocks.getUser.mockResolvedValue(session.user);
    mocks.getSession.mockResolvedValue(session);

    const useStore = createAuthStore({ authService, fetchRole });
    await useStore.getState().initialize();

    expect(useStore.getState().role).toBeNull();
    expect(useStore.getState().user).toEqual(session.user);
  });
});
