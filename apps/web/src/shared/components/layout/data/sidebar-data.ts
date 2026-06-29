import {
  Bell,
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

const rawSidebarData: SidebarData = {
  user: {
    name: "TrendScout Demo",
    email: "demo@trendscout.app",
    avatar: "",
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

export function getSidebarData(_production = isProd): SidebarData {
  return rawSidebarData;
}

export const sidebarData: SidebarData = getSidebarData();
