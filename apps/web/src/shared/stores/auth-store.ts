import { createAuthStore } from "@repo/client-core";
import type { RoleName } from "@repo/shared";
import { http } from "@/shared/lib/api-client";
import { authService, supabase } from "@/shared/lib/supabase";

// Best-effort name extraction from the Supabase user object. New email/password
// sign-ups have no metadata, so we derive a placeholder from the email local
// part; admins can rename later.
function deriveNameFromSupabaseUser(user: {
  email?: string | null;
  user_metadata?: Record<string, unknown> | null;
}): { firstName: string; lastName: string } {
  const md = user.user_metadata ?? {};
  const firstName =
    typeof md.first_name === "string"
      ? md.first_name
      : typeof md.firstName === "string"
        ? md.firstName
        : "";
  const lastName =
    typeof md.last_name === "string"
      ? md.last_name
      : typeof md.lastName === "string"
        ? md.lastName
        : "";
  if (firstName || lastName) return { firstName, lastName };
  const local = (user.email ?? "").split("@")[0] ?? "";
  return { firstName: local || "User", lastName: "" };
}

// If `profiles` has no row for this Supabase auth_uid, the backend returns 401
// on /auth/me. Self-heal by hitting /auth/register (the backend creates the
// profile from the JWT's `sub` + `email` plus the name we pass), then retry
// once. Webhooks would normally do this in prod, but they aren't configured
// on every Supabase project (dev included).
async function fetchUserRole(): Promise<RoleName | null> {
  try {
    const { data } = await http.get<{ role: RoleName }>("/auth/me");
    return data.role;
  } catch (err) {
    const status = (err as { status?: number })?.status;
    if (status !== 401) return "user";

    const { data } = await supabase.auth.getUser();
    const user = data.user;
    if (!user) return "user";

    try {
      await http.post("/auth/register", deriveNameFromSupabaseUser(user));
    } catch {
      // Already exists / other error — retry /auth/me anyway.
    }

    try {
      const { data: me } = await http.get<{ role: RoleName }>("/auth/me");
      return me.role;
    } catch {
      return "user";
    }
  }
}

export const useAuthStore = createAuthStore<RoleName>({
  authService,
  onTokenChange: (token) => {
    if (token) {
      http.defaults.headers.common.Authorization = `Bearer ${token}`;
    } else {
      delete http.defaults.headers.common.Authorization;
    }
  },
  fetchRole: fetchUserRole,
});
