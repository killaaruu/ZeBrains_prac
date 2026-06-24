import { beforeEach, describe, expect, it, vi } from "vitest";
import { SupabaseAuthWebhookHandler } from "./supabase-auth.webhook";

describe("SupabaseAuthWebhookHandler", () => {
  let handler: SupabaseAuthWebhookHandler;
  let mockAuthService: {
    activateByEmail: ReturnType<typeof vi.fn>;
    updateLastLogin: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockAuthService = {
      activateByEmail: vi.fn().mockResolvedValue(undefined),
      updateLastLogin: vi.fn().mockResolvedValue(undefined),
    };
    handler = new SupabaseAuthWebhookHandler(mockAuthService as never);
  });

  it("activates the user by email when email is confirmed", async () => {
    await handler.handle({
      type: "user.updated",
      record: {
        id: "auth-uid-1",
        email: "user@example.com",
        email_confirmed_at: "2026-06-18T00:00:00.000Z",
      },
    });

    expect(mockAuthService.activateByEmail).toHaveBeenCalledWith("user@example.com");
    expect(mockAuthService.updateLastLogin).not.toHaveBeenCalled();
  });

  it("does not activate when email is not yet confirmed", async () => {
    await handler.handle({
      type: "user.updated",
      record: {
        id: "auth-uid-1",
        email: "user@example.com",
        email_confirmed_at: null,
      },
    });

    expect(mockAuthService.activateByEmail).not.toHaveBeenCalled();
  });

  it("updates last login on a signed-in event", async () => {
    await handler.handle({
      type: "user.signed_in",
      record: { id: "auth-uid-2" },
    });

    expect(mockAuthService.updateLastLogin).toHaveBeenCalledWith("auth-uid-2");
    expect(mockAuthService.activateByEmail).not.toHaveBeenCalled();
  });
});
