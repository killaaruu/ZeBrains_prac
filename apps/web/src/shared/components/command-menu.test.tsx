import { render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => vi.fn(),
}));

vi.mock("@/shared/context/search-provider", () => ({
  useSearch: () => ({ open: true, setOpen: vi.fn() }),
}));

vi.mock("./layout/data/sidebar-data", () => ({
  sidebarData: {
    navGroups: [{ title: "Основное", items: [{ title: "Главная", url: "/" }] }],
  },
}));

vi.mock("@/shared/ui/command", () => ({
  CommandDialog: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
    open ? <div>{children}</div> : null,
  CommandEmpty: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CommandGroup: ({ children, heading }: { children: React.ReactNode; heading: string }) => (
    <section>
      <h2>{heading}</h2>
      {children}
    </section>
  ),
  CommandInput: ({ placeholder }: { placeholder: string }) => (
    <input aria-label={placeholder} placeholder={placeholder} />
  ),
  CommandItem: ({ children }: { children: React.ReactNode }) => (
    <button type="button">{children}</button>
  ),
  CommandList: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CommandSeparator: () => <hr />,
}));

vi.mock("@/shared/ui/scroll-area", () => ({
  ScrollArea: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

const { CommandMenu } = await import("./command-menu");

describe("CommandMenu", () => {
  it("does not include color theme commands", () => {
    render(<CommandMenu />);

    expect(screen.queryByText("Theme")).not.toBeInTheDocument();
    expect(screen.queryByText("Light")).not.toBeInTheDocument();
    expect(screen.queryByText("Dark")).not.toBeInTheDocument();
    expect(screen.queryByText("System")).not.toBeInTheDocument();
  });
});
