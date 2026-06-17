export type OAuthProvider = "google" | "apple" | "github";
export type AuthEvent = "SIGNED_IN" | "SIGNED_OUT" | "TOKEN_REFRESHED";
export type Unsubscribe = () => void;

export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  avatarUrl?: string;
}

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  user: AuthUser;
}

export interface IAuthService {
  signUp(email: string, password: string): Promise<AuthUser>;
  signIn(email: string, password: string): Promise<AuthUser>;
  signInWithOAuth(provider: OAuthProvider): Promise<void>;
  signOut(): Promise<void>;
  resetPassword(email: string): Promise<void>;
  getSession(): Promise<AuthSession | null>;
  getUser(): Promise<AuthUser | null>;
  onAuthStateChange(
    callback: (event: AuthEvent, user: AuthUser | null, session: AuthSession | null) => void,
  ): Unsubscribe;
}
