import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createQueryClientWrapper } from "@/shared/test/setup-hooks";

const mockSignIn = vi.fn();
const mockGetSession = vi.fn();
const mockNavigate = vi.fn();
const mockSetUser = vi.fn();

vi.mock("@/shared/lib/supabase", () => ({
  authService: { signIn: mockSignIn, getSession: mockGetSession },
}));

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock("@/shared/stores/auth-store", () => ({
  useAuthStore: vi.fn((selector: (state: any) => any) => selector({ setUser: mockSetUser })),
}));

const { useSignIn } = await import("./use-sign-in");

describe("useSignIn", () => {
  const mockUser = { id: "1", email: "user@example.com" };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls authService.signIn with email and password", async () => {
    mockSignIn.mockResolvedValue(mockUser);

    const { result } = renderHook(() => useSignIn(), { wrapper: createQueryClientWrapper() });

    await act(async () => {
      await result.current.mutateAsync({ email: "user@example.com", password: "secret123" });
    });

    expect(mockSignIn).toHaveBeenCalledWith("user@example.com", "secret123");
  });

  it("stores user in auth store on success", async () => {
    mockSignIn.mockResolvedValue(mockUser);

    const { result } = renderHook(() => useSignIn(), { wrapper: createQueryClientWrapper() });

    await act(async () => {
      await result.current.mutateAsync({ email: "user@example.com", password: "secret123" });
    });

    expect(mockSetUser).toHaveBeenCalledWith(mockUser);
  });

  it("navigates to / by default on success", async () => {
    mockSignIn.mockResolvedValue(mockUser);

    const { result } = renderHook(() => useSignIn(), { wrapper: createQueryClientWrapper() });

    await act(async () => {
      await result.current.mutateAsync({ email: "user@example.com", password: "secret123" });
    });

    expect(mockNavigate).toHaveBeenCalledWith({ to: "/" });
  });

  it("navigates to redirectTo when provided", async () => {
    mockSignIn.mockResolvedValue(mockUser);

    const { result } = renderHook(() => useSignIn({ redirectTo: "/dashboard" }), {
      wrapper: createQueryClientWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync({ email: "user@example.com", password: "secret123" });
    });

    expect(mockNavigate).toHaveBeenCalledWith({ to: "/dashboard" });
  });

  it("exposes error when signIn fails", async () => {
    mockSignIn.mockRejectedValue(new Error("Invalid credentials"));

    const { result } = renderHook(() => useSignIn(), { wrapper: createQueryClientWrapper() });

    await act(async () => {
      try {
        await result.current.mutateAsync({ email: "user@example.com", password: "wrong" });
      } catch {}
    });

    await waitFor(() => {
      expect(result.current.error?.message).toBe("Invalid credentials");
    });
  });

  describe("returnUrl handling", () => {
    const ORIGINAL_HREF = window.location.href;
    let hrefValue = ORIGINAL_HREF;

    beforeEach(() => {
      hrefValue = ORIGINAL_HREF;
      vi.stubEnv("VITE_ALLOWED_RETURN_ORIGINS", "http://localhost:5173");
      Object.defineProperty(window, "location", {
        configurable: true,
        value: {
          get href() {
            return hrefValue;
          },
          set href(v: string) {
            hrefValue = v;
          },
        },
      });
    });

    it("redirects to returnUrl with tokens in hash when origin is allowed", async () => {
      mockSignIn.mockResolvedValue(mockUser);
      mockGetSession.mockResolvedValue({
        accessToken: "access-tok",
        refreshToken: "refresh-tok",
      });

      const returnUrl = "http://localhost:5173/some/path";
      const { result } = renderHook(() => useSignIn({ returnUrl }), {
        wrapper: createQueryClientWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync({ email: "user@example.com", password: "secret123" });
      });

      expect(hrefValue).toContain("http://localhost:5173/some/path#");
      expect(hrefValue).toContain("access_token=access-tok");
      expect(hrefValue).toContain("refresh_token=refresh-tok");
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it("falls back to navigate when returnUrl origin is not in allowlist", async () => {
      mockSignIn.mockResolvedValue(mockUser);
      mockGetSession.mockResolvedValue({
        accessToken: "access-tok",
        refreshToken: "refresh-tok",
      });

      const { result } = renderHook(
        () => useSignIn({ returnUrl: "https://evil.example.com/foo" }),
        { wrapper: createQueryClientWrapper() },
      );

      await act(async () => {
        await result.current.mutateAsync({ email: "user@example.com", password: "secret123" });
      });

      expect(hrefValue).toBe(ORIGINAL_HREF);
      expect(mockNavigate).toHaveBeenCalledWith({ to: "/" });
    });

    it("falls back to navigate when returnUrl is malformed", async () => {
      mockSignIn.mockResolvedValue(mockUser);
      mockGetSession.mockResolvedValue({
        accessToken: "access-tok",
        refreshToken: "refresh-tok",
      });

      const { result } = renderHook(() => useSignIn({ returnUrl: "not a url" }), {
        wrapper: createQueryClientWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync({ email: "user@example.com", password: "secret123" });
      });

      expect(hrefValue).toBe(ORIGINAL_HREF);
      expect(mockNavigate).toHaveBeenCalledWith({ to: "/" });
    });

    it("falls back to navigate when session is null", async () => {
      mockSignIn.mockResolvedValue(mockUser);
      mockGetSession.mockResolvedValue(null);

      const { result } = renderHook(
        () => useSignIn({ returnUrl: "http://localhost:5173/some/path" }),
        { wrapper: createQueryClientWrapper() },
      );

      await act(async () => {
        await result.current.mutateAsync({ email: "user@example.com", password: "secret123" });
      });

      expect(hrefValue).toBe(ORIGINAL_HREF);
      expect(mockNavigate).toHaveBeenCalled();
    });
  });
});
