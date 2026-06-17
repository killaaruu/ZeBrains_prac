import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useAuthStore } from "@/shared/stores/auth-store";

export const Route = createFileRoute("/")({
  component: IndexRedirect,
});

export function IndexRedirect() {
  const user = useAuthStore((state) => state.user);
  const isInitialized = useAuthStore((state) => state.isInitialized);

  if (!isInitialized) {
    return <div className="flex h-screen w-screen items-center justify-center">Loading...</div>;
  }

  if (user) {
    return <Navigate to="/dashboard" />;
  }

  return <Navigate to="/sign-in" />;
}
