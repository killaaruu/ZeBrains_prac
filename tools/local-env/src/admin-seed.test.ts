import { describe, expect, it, vi } from "vitest";
import { seedLocalAdminUser } from "./admin-seed";

describe("seedLocalAdminUser", () => {
  it("skips when real Supabase admin credentials are not configured", async () => {
    const query = vi.fn();
    const fetcher = vi.fn();
    const logger = { log: vi.fn(), warn: vi.fn() };

    await seedLocalAdminUser(
      {
        databaseUrl: "postgresql://local",
        supabaseUrl: "https://local-dev-placeholder.supabase.co",
        serviceRoleKey: "",
        email: "admin@mad-os.local",
        password: "MadOSLocalAdmin123!",
        localDevAuthEnabled: false,
        localDevAdminAuthUid: "00000000-0000-4000-8000-000000000001",
      },
      { query, fetcher, logger },
    );

    expect(fetcher).not.toHaveBeenCalled();
    expect(query).not.toHaveBeenCalled();
    expect(logger.log).toHaveBeenCalledWith(
      "Local admin seed skipped: Supabase admin credentials are not configured.",
    );
  });

  it("seeds an active local admin profile without Supabase when local dev auth is enabled", async () => {
    const query = vi.fn();
    const fetcher = vi.fn();
    const logger = { log: vi.fn(), warn: vi.fn() };

    await seedLocalAdminUser(
      {
        databaseUrl: "postgresql://local",
        supabaseUrl: "https://local-dev-placeholder.supabase.co",
        serviceRoleKey: "",
        email: "admin@mad-os.local",
        password: "MadOSLocalAdmin123!",
        localDevAuthEnabled: true,
        localDevAdminAuthUid: "00000000-0000-4000-8000-000000000001",
      },
      { query, fetcher, logger },
    );

    expect(fetcher).not.toHaveBeenCalled();
    expect(query).toHaveBeenCalledWith(
      "postgresql://local",
      expect.stringContaining("insert into profiles"),
      ["00000000-0000-4000-8000-000000000001", "admin@mad-os.local"],
    );
    expect(logger.log).toHaveBeenCalledWith("Local admin ready: admin@mad-os.local");
  });

  it("creates a Supabase Auth user and upserts an active admin profile", async () => {
    const query = vi.fn();
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: "11111111-1111-4111-8111-111111111111" }),
    });
    const logger = { log: vi.fn(), warn: vi.fn() };

    await seedLocalAdminUser(
      {
        databaseUrl: "postgresql://local",
        supabaseUrl: "https://project.supabase.co",
        serviceRoleKey: "sb_secret_real",
        email: "admin@example.com",
        password: "Password123!",
        localDevAuthEnabled: true,
        localDevAdminAuthUid: "00000000-0000-4000-8000-000000000001",
      },
      { query, fetcher, logger },
    );

    expect(fetcher).toHaveBeenCalledWith(
      "https://project.supabase.co/auth/v1/admin/users",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          apikey: "sb_secret_real",
          Authorization: "Bearer sb_secret_real",
        }),
        body: JSON.stringify({
          email: "admin@example.com",
          password: "Password123!",
          email_confirm: true,
          app_metadata: { role: "admin", local_dev: true },
          user_metadata: { first_name: "Local", last_name: "Admin" },
        }),
      }),
    );
    expect(query).toHaveBeenCalledWith(
      "postgresql://local",
      expect.stringContaining("insert into profiles"),
      ["11111111-1111-4111-8111-111111111111", "admin@example.com"],
    );
  });
});
