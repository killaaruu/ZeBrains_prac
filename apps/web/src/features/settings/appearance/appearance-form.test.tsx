import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { FontProvider } from "@/shared/context/font-provider";
import { ThemeProvider } from "@/shared/context/theme-provider";
import { AppearanceForm } from "./appearance-form";

function renderAppearanceForm() {
  return render(
    <ThemeProvider>
      <FontProvider>
        <AppearanceForm />
      </FontProvider>
    </ThemeProvider>,
  );
}

describe("AppearanceForm", () => {
  beforeEach(() => {
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
  });

  it("does not render theme selection controls", () => {
    renderAppearanceForm();

    expect(screen.queryByText("Тема")).not.toBeInTheDocument();
    expect(screen.queryByText("Выберите тему для панели управления.")).not.toBeInTheDocument();
    expect(screen.queryByText("Светлая")).not.toBeInTheDocument();
    expect(screen.queryByText("Тёмная")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Шрифт")).toBeInTheDocument();
  });
});
