import { useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuthStore } from "@/shared/stores/auth-store";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  redirectTo?: string;
}

export function ProtectedRoute({
  children,
  requireAuth = true,
  redirectTo = "/sign-in",
}: ProtectedRouteProps) {
  const navigate = useNavigate();
  const { user, isLoading, isInitialized } = useAuthStore();

  useEffect(() => {
    if (!isInitialized || isLoading) return;

    if (requireAuth && !user) {
      navigate({ to: redirectTo });
    }
  }, [user, isLoading, isInitialized, requireAuth, redirectTo, navigate]);

  if (!isInitialized || isLoading) {
    return <div className="flex h-screen w-screen items-center justify-center">Loading...</div>;
  }

  if (requireAuth && !user) {
    return null;
  }

  return <>{children}</>;
}
