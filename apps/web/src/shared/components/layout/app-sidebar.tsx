import { useMemo } from "react";
import { useLayout } from "@/shared/context/layout-provider";
import { useAuthStore } from "@/shared/stores/auth-store";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/shared/ui/sidebar";
import { sidebarData } from "./data/sidebar-data";
import { NavGroup } from "./nav-group";
import { NavUser } from "./nav-user";
import { TeamSwitcher } from "./team-switcher";

export function AppSidebar() {
  const { collapsible, variant } = useLayout();
  const role = useAuthStore((s) => s.role);
  const authUser = useAuthStore((s) => s.user);

  const visibleGroups = useMemo(
    () => sidebarData.navGroups.filter((g) => !g.adminOnly || role === "admin"),
    [role],
  );

  const navUser = authUser
    ? {
        name: authUser.name ?? authUser.email?.split("@")[0] ?? "",
        email: authUser.email ?? "",
        avatar: authUser.avatarUrl ?? "",
      }
    : sidebarData.user;

  return (
    <Sidebar collapsible={collapsible} variant={variant}>
      <SidebarHeader>
        <TeamSwitcher teams={sidebarData.teams} />
      </SidebarHeader>
      <SidebarContent>
        {visibleGroups.map((props) => (
          <NavGroup key={props.title} {...props} />
        ))}
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={navUser} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
