import { render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@/shared/components/sign-out-dialog", () => ({
  SignOutDialog: () => null,
}));

vi.mock("@/shared/hooks/use-dialog-state", () => ({
  default: () => [false, vi.fn()],
}));

vi.mock("@/shared/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuGroup: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuItem: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuLabel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuSeparator: () => <hr />,
}));

vi.mock("@/shared/ui/sidebar", () => ({
  SidebarMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SidebarMenuButton: ({ children }: { children: React.ReactNode }) => (
    <button type="button">{children}</button>
  ),
  SidebarMenuItem: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useSidebar: () => ({ isMobile: false }),
}));

const { NavUser } = await import("./nav-user");

describe("NavUser", () => {
  it("derives avatar fallback initials from the current user name", () => {
    render(
      <NavUser
        user={{
          name: "TrendScout Demo",
          email: "demo@trendscout.app",
          avatar: "",
        }}
      />,
    );

    expect(screen.getAllByText("TD").length).toBeGreaterThan(0);
  });
});
