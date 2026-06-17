import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AppSidebar } from "@/shared/components/layout/app-sidebar";
import { ProtectedRoute } from "@/shared/components/protected-route";
import { SkipToMain } from "@/shared/components/skip-to-main";
import { LayoutProvider } from "@/shared/context/layout-provider";
import { SearchProvider } from "@/shared/context/search-provider";
import { getCookie } from "@/shared/lib/storage";
import { SidebarInset, SidebarProvider } from "@/shared/ui/sidebar";

export const Route = createFileRoute("/_app")({
  component: AppLayout,
});

function AppLayout() {
  const defaultOpen = getCookie("sidebar_state") !== "false";

  return (
    <ProtectedRoute>
      <SearchProvider>
        <LayoutProvider>
          <SidebarProvider defaultOpen={defaultOpen}>
            <SkipToMain />
            <AppSidebar />
            <SidebarInset>
              <Outlet />
            </SidebarInset>
          </SidebarProvider>
        </LayoutProvider>
      </SearchProvider>
    </ProtectedRoute>
  );
}
