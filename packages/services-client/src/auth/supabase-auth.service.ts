import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  AuthEvent,
  AuthSession,
  AuthUser,
  IAuthService,
  OAuthProvider,
  Unsubscribe,
} from "./auth.interface";

interface SupabaseUserLike {
  id: string;
  email?: string;
  user_metadata?: {
    full_name?: string;
    avatar_url?: string;
  };
}

interface SupabaseSessionLike {
  access_token: string;
  refresh_token: string;
  expires_at?: number;
  user: SupabaseUserLike;
}

function mapUser(user: SupabaseUserLike): AuthUser {
  return {
    id: user.id,
    email: user.email ?? "",
    name: user.user_metadata?.full_name,
    avatarUrl: user.user_metadata?.avatar_url,
  };
}

function mapSession(session: SupabaseSessionLike): AuthSession {
  return {
    accessToken: session.access_token,
    refreshToken: session.refresh_token,
    expiresAt: session.expires_at ?? 0,
    user: mapUser(session.user),
  };
}

function isRecoverableError(error: unknown): boolean {
  if (error instanceof TypeError && error.message.includes("Failed to fetch")) {
    return true;
  }
  if (error instanceof DOMException && error.name === "AbortError") {
    return true;
  }
  return false;
}

export class SupabaseAuthService implements IAuthService {
  constructor(private readonly supabase: SupabaseClient) {}

  async signUp(email: string, password: string): Promise<AuthUser> {
    const { data, error } = await this.supabase.auth.signUp({ email, password });
    if (error) throw new Error(error.message);
    if (!data.user) throw new Error("Sign up failed: no user returned");
    return mapUser(data.user);
  }

  async signIn(email: string, password: string): Promise<AuthUser> {
    const { data, error } = await this.supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
    if (!data.user) throw new Error("Sign in failed: no user returned");
    return mapUser(data.user);
  }

  async signInWithOAuth(_provider: OAuthProvider): Promise<void> {
    throw new Error("OAuth not configured");
  }

  async resetPassword(email: string): Promise<void> {
    const { error } = await this.supabase.auth.resetPasswordForEmail(email);
    if (error) throw new Error(error.message);
  }

  async signOut(): Promise<void> {
    const { error } = await this.supabase.auth.signOut();
    if (error) throw new Error(error.message);
  }

  async getSession(): Promise<AuthSession | null> {
    let data: { session: unknown };
    let error: { message: string; status?: number } | null;

    try {
      ({ data, error } = await this.supabase.auth.getSession());
    } catch (e) {
      if (isRecoverableError(e)) return null;
      throw e;
    }

    if (error) {
      if (
        error.message.includes("Auth session missing!") ||
        error.message.includes("Missing session") ||
        error.message.includes("Invalid session") ||
        error.message.includes("JWT expired") ||
        error.status === 401 ||
        error.status === 403
      ) {
        return null;
      }
      throw new Error(error.message);
    }

    if (!data.session) return null;
    return mapSession(data.session as unknown as SupabaseSessionLike);
  }

  async getUser(): Promise<AuthUser | null> {
    let data: { user: unknown };
    let error: { message: string; status?: number } | null;

    try {
      ({ data, error } = await this.supabase.auth.getUser());
    } catch (e) {
      if (isRecoverableError(e)) return null;
      throw e;
    }

    if (error) {
      if (
        error.message.includes("Auth session missing!") ||
        error.message.includes("Missing session") ||
        error.message.includes("Invalid session") ||
        error.message.includes("JWT expired") ||
        error.status === 401 ||
        error.status === 403
      ) {
        return null;
      }
      throw new Error(error.message);
    }

    if (!data.user) return null;
    return mapUser(data.user as SupabaseUserLike);
  }

  onAuthStateChange(
    callback: (event: AuthEvent, user: AuthUser | null, session: AuthSession | null) => void,
  ): Unsubscribe {
    const { data } = this.supabase.auth.onAuthStateChange((event, session) => {
      const mappedUser = session?.user
        ? mapUser(session.user as unknown as SupabaseUserLike)
        : null;
      const mappedSession = session ? mapSession(session as unknown as SupabaseSessionLike) : null;
      callback(event as AuthEvent, mappedUser, mappedSession);
    });

    return () => {
      data.subscription.unsubscribe();
    };
  }
}
