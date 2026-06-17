import type { AuthUser, IAuthService, Unsubscribe } from "@repo/services-client/auth";
import { create, type StoreApi, type UseBoundStore } from "zustand";

export interface AuthStoreOptions<TRole = string> {
  authService: IAuthService;
  onTokenChange?: (token: string | null) => void;
  fetchRole?: () => Promise<TRole | null>;
}

export interface AuthStoreState<TRole = string> {
  user: AuthUser | null;
  role: TRole | null;
  isLoading: boolean;
  isInitialized: boolean;
  setUser: (user: AuthUser | null) => void;
  initialize: () => Promise<void>;
  cleanup: () => void;
  signOut: () => Promise<void>;
}

export function createAuthStore<TRole = string>(
  options: AuthStoreOptions<TRole>,
): UseBoundStore<StoreApi<AuthStoreState<TRole>>> {
  const { authService, onTokenChange, fetchRole } = options;

  let unsubscribe: Unsubscribe | null = null;

  const notifyToken = (token: string | null) => {
    onTokenChange?.(token);
  };

  return create<AuthStoreState<TRole>>((set, get) => ({
    user: null,
    role: null,
    isLoading: true,
    isInitialized: false,

    setUser: (user) => set({ user }),

    initialize: async () => {
      if (get().isInitialized) {
        return;
      }

      try {
        const [user, session] = await Promise.all([
          authService.getUser(),
          authService.getSession(),
        ]);

        notifyToken(session?.accessToken ?? null);

        let role: TRole | null = null;
        if (user && session?.accessToken && fetchRole) {
          try {
            role = await fetchRole();
          } catch {
            role = null;
          }
        }

        set({ user, role, isLoading: false, isInitialized: true });

        unsubscribe = authService.onAuthStateChange((_event, nextUser, nextSession) => {
          notifyToken(nextSession?.accessToken ?? null);
          set({ user: nextUser });
        });
      } catch {
        notifyToken(null);
        set({ user: null, role: null, isLoading: false, isInitialized: true });
      }
    },

    cleanup: () => {
      if (unsubscribe) {
        unsubscribe();
        unsubscribe = null;
      }
      set({ user: null, role: null, isLoading: true, isInitialized: false });
    },

    signOut: async () => {
      try {
        await authService.signOut();
      } finally {
        // Clear local auth state and outgoing token even if the remote signOut failed,
        // otherwise a network blip would leave a stale token attached to API requests.
        notifyToken(null);
        set({ user: null, role: null });
      }
    },
  }));
}
