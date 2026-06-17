import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ThemeProvider, useTheme } from "./theme-provider";

function ThemeProbe() {
  const { resolvedTheme, theme } = useTheme();
  return (
    <div>
      <span>theme:{theme}</span>
      <span>resolved:{resolvedTheme}</span>
    </div>
  );
}

describe("ThemeProvider", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.className = "";
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query === "(prefers-color-scheme: dark)",
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
  });

  afterEach(() => {
    localStorage.clear();
    document.documentElement.className = "";
  });

  it("defaults to the light theme even when the system preference is dark", async () => {
    render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>,
    );

    expect(screen.getByText("theme:light")).toBeInTheDocument();
    expect(screen.getByText("resolved:light")).toBeInTheDocument();
    await waitFor(() => expect(document.documentElement).toHaveClass("light"));
    expect(document.documentElement).not.toHaveClass("dark");
  });

  it("ignores a previously saved dark theme because color switching is disabled", async () => {
    localStorage.setItem("theme", "dark");

    render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>,
    );

    expect(screen.getByText("theme:light")).toBeInTheDocument();
    expect(screen.getByText("resolved:light")).toBeInTheDocument();
    await waitFor(() => expect(document.documentElement).toHaveClass("light"));
    expect(document.documentElement).not.toHaveClass("dark");
  });
});
