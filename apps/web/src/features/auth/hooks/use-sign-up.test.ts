import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createQueryClientWrapper } from "@/shared/test/setup-hooks";

const mockSignUp = vi.fn();
const mockNavigate = vi.fn();
const mockSetUser = vi.fn();

vi.mock("@/shared/lib/supabase", () => ({
  authService: { signUp: mockSignUp },
}));

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock("@/shared/stores/auth-store", () => ({
  useAuthStore: vi.fn((selector: (state: any) => any) => selector({ setUser: mockSetUser })),
}));

const { useSignUp } = await import("./use-sign-up");

describe("useSignUp", () => {
  const mockUser = { id: "2", email: "new@example.com" };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls authService.signUp with email and password", async () => {
    mockSignUp.mockResolvedValue(mockUser);

    const { result } = renderHook(() => useSignUp(), { wrapper: createQueryClientWrapper() });

    await act(async () => {
      await result.current.mutateAsync({ email: "new@example.com", password: "password123" });
    });

    expect(mockSignUp).toHaveBeenCalledWith("new@example.com", "password123");
  });

  it("stores user in auth store on success", async () => {
    mockSignUp.mockResolvedValue(mockUser);

    const { result } = renderHook(() => useSignUp(), { wrapper: createQueryClientWrapper() });

    await act(async () => {
      await result.current.mutateAsync({ email: "new@example.com", password: "password123" });
    });

    expect(mockSetUser).toHaveBeenCalledWith(mockUser);
  });

  it("navigates to / on success", async () => {
    mockSignUp.mockResolvedValue(mockUser);

    const { result } = renderHook(() => useSignUp(), { wrapper: createQueryClientWrapper() });

    await act(async () => {
      await result.current.mutateAsync({ email: "new@example.com", password: "password123" });
    });

    expect(mockNavigate).toHaveBeenCalledWith({ to: "/" });
  });

  it("exposes error when signUp fails", async () => {
    mockSignUp.mockRejectedValue(new Error("Email already registered"));

    const { result } = renderHook(() => useSignUp(), { wrapper: createQueryClientWrapper() });

    await act(async () => {
      try {
        await result.current.mutateAsync({ email: "existing@example.com", password: "pass123" });
      } catch {}
    });

    await waitFor(() => {
      expect(result.current.error?.message).toBe("Email already registered");
    });
  });
});
