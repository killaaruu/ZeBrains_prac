import { createRootRoute, Outlet } from "@tanstack/react-router";
import { IDProvider } from "@/shared/components/id-provider";
import { DirectionProvider } from "@/shared/context/direction-provider";
import { FontProvider } from "@/shared/context/font-provider";
import { ThemeProvider } from "@/shared/context/theme-provider";
import { AuthProvider } from "@/shared/providers/auth-provider";
import { Toaster } from "@/shared/ui/sonner";

export const Route = createRootRoute({
  component: RootLayout,
});

function RootLayout() {
  return (
    <IDProvider>
      <ThemeProvider>
        <FontProvider>
          <DirectionProvider>
            <AuthProvider>
              <Outlet />
              <Toaster />
            </AuthProvider>
          </DirectionProvider>
        </FontProvider>
      </ThemeProvider>
    </IDProvider>
  );
}
