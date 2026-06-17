import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createQueryClientWrapper } from "@/shared/test/setup-hooks";

const mockResetPassword = vi.fn();

vi.mock("@/shared/lib/supabase", () => ({
  authService: { resetPassword: mockResetPassword },
}));

const { useForgotPassword } = await import("./use-forgot-password");

describe("useForgotPassword", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls authService.resetPassword with the email", async () => {
    mockResetPassword.mockResolvedValue(undefined);

    const { result } = renderHook(() => useForgotPassword(), {
      wrapper: createQueryClientWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync({ email: "test@example.com" });
    });

    expect(mockResetPassword).toHaveBeenCalledWith("test@example.com");
  });

  it("exposes error when resetPassword fails", async () => {
    mockResetPassword.mockRejectedValue(new Error("User not found"));

    const { result } = renderHook(() => useForgotPassword(), {
      wrapper: createQueryClientWrapper(),
    });

    await act(async () => {
      try {
        await result.current.mutateAsync({ email: "unknown@example.com" });
      } catch {}
    });

    await waitFor(() => {
      expect(result.current.error?.message).toBe("User not found");
    });
  });
});
