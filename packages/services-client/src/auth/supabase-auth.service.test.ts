import { beforeEach, describe, expect, it, vi } from "vitest";
import { SupabaseAuthService } from "./supabase-auth.service";

describe("SupabaseAuthService.resetPassword", () => {
  const mockResetPasswordForEmail = vi.fn();
  const supabase = {
    auth: { resetPasswordForEmail: mockResetPasswordForEmail },
  } as any;
  const service = new SupabaseAuthService(supabase);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls supabase.auth.resetPasswordForEmail with the given email", async () => {
    mockResetPasswordForEmail.mockResolvedValue({ data: {}, error: null });

    await service.resetPassword("user@example.com");

    expect(mockResetPasswordForEmail).toHaveBeenCalledWith("user@example.com");
  });

  it("throws when supabase returns an error", async () => {
    mockResetPasswordForEmail.mockResolvedValue({
      data: {},
      error: { message: "User not found" },
    });

    await expect(service.resetPassword("unknown@example.com")).rejects.toThrow("User not found");
  });
});
