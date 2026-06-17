import { useEffect } from "react";
import { useAuthStore } from "@/shared/stores/auth-store";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const initialize = useAuthStore((state) => state.initialize);
  const cleanup = useAuthStore((state) => state.cleanup);
  const isInitialized = useAuthStore((state) => state.isInitialized);

  useEffect(() => {
    initialize();
    return () => {
      cleanup();
    };
  }, [initialize, cleanup]);

  if (!isInitialized) {
    return <div className="flex h-screen w-screen items-center justify-center">Loading...</div>;
  }

  return <>{children}</>;
}
