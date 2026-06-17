import type {
  AuthEvent,
  AuthSession,
  AuthUser,
  IAuthService,
  OAuthProvider,
  Unsubscribe,
} from "@repo/services-client/auth";

type ApiClient = {
  post: <T>(url: string, body: unknown) => Promise<T>;
};

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

type LocalDevLoginResponse = AuthSession;

const STORAGE_KEY = "app.local-dev-auth-session";

export class LocalDevAuthService implements IAuthService {
  constructor(
    private readonly apiClient: ApiClient,
    private readonly storage: StorageLike = window.localStorage,
  ) {}

  async signUp(): Promise<AuthUser> {
    throw new Error("Sign-up is disabled in local dev mode");
  }

  async signIn(email: string, password: string): Promise<AuthUser> {
    const session = await this.apiClient.post<LocalDevLoginResponse>("/auth/local-dev-login", {
      email,
      password,
    });
    this.storage.setItem(STORAGE_KEY, JSON.stringify(session));
    return session.user;
  }

  async signInWithOAuth(_provider: OAuthProvider): Promise<void> {
    throw new Error("OAuth is not configured in local dev mode");
  }

  async signOut(): Promise<void> {
    this.storage.removeItem(STORAGE_KEY);
  }

  async resetPassword(): Promise<void> {
    throw new Error("Password reset is disabled in local dev mode");
  }

  async getSession(): Promise<AuthSession | null> {
    const raw = this.storage.getItem(STORAGE_KEY);
    if (!raw) return null;

    try {
      return JSON.parse(raw) as AuthSession;
    } catch {
      this.storage.removeItem(STORAGE_KEY);
      return null;
    }
  }

  async getUser(): Promise<AuthUser | null> {
    const session = await this.getSession();
    return session?.user ?? null;
  }

  onAuthStateChange(
    _callback: (event: AuthEvent, user: AuthUser | null, session: AuthSession | null) => void,
  ): Unsubscribe {
    return () => {};
  }
}
