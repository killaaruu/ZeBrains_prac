import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { Dashboard } from "./index";

const mockNavigate = vi.fn();

vi.mock("@/shared/components/layout/header", () => ({
  Header: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/shared/components/profile-dropdown", () => ({
  ProfileDropdown: () => null,
}));

vi.mock("@/shared/components/theme-switch", () => ({
  ThemeSwitch: () => null,
}));

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock("@repo/client-core", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@repo/client-core")>();
  return {
    ...actual,
    useCreateReport: () => ({
      mutateAsync: vi.fn(),
      isPending: false,
    }),
    useReports: () => ({
      data: [
        {
          id: "550e8400-e29b-41d4-a716-446655440000",
          userId: "user-1",
          topic: "AI coding assistants",
          status: "done",
          result: null,
          error: null,
          createdAt: "2026-06-17T12:00:00.000Z",
          updatedAt: "2026-06-17T12:00:00.000Z",
        },
      ],
      isLoading: false,
      isError: false,
    }),
    useReport: () => ({
      data: {
        id: "550e8400-e29b-41d4-a716-446655440000",
        userId: "user-1",
        topic: "AI coding assistants",
        status: "done",
        result: {
          trend_name: "AI coding assistants",
          global_market: "Не найдено",
          ru_market: "Не найдено",
          sustainability: {
            score: 8,
            arguments_for: ["Developer demand"],
            arguments_against: ["Evaluation complexity"],
          },
        },
        error: null,
        createdAt: "2026-06-17T12:00:00.000Z",
        updatedAt: "2026-06-17T12:05:00.000Z",
      },
      isLoading: false,
      isError: false,
    }),
  };
});

describe("Dashboard", () => {
  it("renders report history and uses the route-selected report view", () => {
    render(<Dashboard reportId="550e8400-e29b-41d4-a716-446655440000" />);

    expect(screen.getByText("TrendScout")).toBeInTheDocument();
    expect(screen.getAllByText("AI coding assistants")).toHaveLength(3);
    expect(screen.getByText("Sustainability score")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /generate report/i })).toBeInTheDocument();
  });
});
