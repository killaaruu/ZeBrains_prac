import {
  Bell,
  FileText,
  HeartPulse,
  LayoutDashboard,
  Monitor,
  Palette,
  Settings,
  UserCog,
  Wrench,
} from "lucide-react";
import { Logo } from "@/shared/assets/logo";
import type { SidebarData } from "../types";

const isProd = import.meta.env.PROD;

// Add titles here to hide nav items in production builds.
// "Example CRUD" is the template's reference vertical (example-entities) — kept in
// local dev for reference, hidden from the customer-facing production build.
const hiddenInProd = new Set<string>(["Example CRUD"]);

const rawSidebarData: SidebarData = {
  user: {
    name: "TrendScout Demo",
    email: "demo@trendscout.app",
    avatar: "/avatars/placeholder.png",
  },
  teams: [
    {
      name: "TrendScout",
      logo: Logo,
      plan: "Research Workspace",
    },
  ],
  navGroups: [
    {
      title: "General",
      items: [
        { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
        { title: "Example CRUD", url: "/example", icon: FileText },
        { title: "Health", url: "/health", icon: HeartPulse },
      ],
    },
    {
      title: "Other",
      items: [
        {
          title: "Settings",
          icon: Settings,
          items: [
            { title: "Profile", url: "/settings", icon: UserCog },
            { title: "Account", url: "/settings/account", icon: Wrench },
            { title: "Appearance", url: "/settings/appearance", icon: Palette },
            { title: "Notifications", url: "/settings/notifications", icon: Bell },
            { title: "Display", url: "/settings/display", icon: Monitor },
          ],
        },
      ],
    },
  ],
};

export function getSidebarData(production = isProd): SidebarData {
  if (!production) return rawSidebarData;

  return {
    ...rawSidebarData,
    navGroups: rawSidebarData.navGroups
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => !hiddenInProd.has(item.title)),
      }))
      .filter((group) => group.items.length > 0),
  };
}

export const sidebarData: SidebarData = getSidebarData();
