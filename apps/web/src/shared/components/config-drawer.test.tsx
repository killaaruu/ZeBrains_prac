import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DirectionProvider } from "@/shared/context/direction-provider";
import { LayoutProvider } from "@/shared/context/layout-provider";
import { ThemeProvider } from "@/shared/context/theme-provider";
import { SidebarProvider } from "@/shared/ui/sidebar";
import { ConfigDrawer } from "./config-drawer";

function renderConfigDrawer() {
  return render(
    <ThemeProvider>
      <DirectionProvider>
        <LayoutProvider>
          <SidebarProvider>
            <ConfigDrawer />
          </SidebarProvider>
        </LayoutProvider>
      </DirectionProvider>
    </ThemeProvider>,
  );
}

describe("ConfigDrawer", () => {
  beforeEach(() => {
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
  });

  it("does not render theme selection controls", () => {
    renderConfigDrawer();

    fireEvent.click(screen.getByRole("button", { name: "Open theme settings" }));

    expect(screen.queryByText("Системная")).not.toBeInTheDocument();
    expect(screen.queryByText("Светлая")).not.toBeInTheDocument();
    expect(screen.queryByText("Тёмная")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Select theme preference")).not.toBeInTheDocument();
  });
});
