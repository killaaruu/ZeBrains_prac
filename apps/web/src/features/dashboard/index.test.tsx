import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { Dashboard } from "./index";

const mockMutate = vi.fn();

vi.mock("@/shared/components/layout/header", () => ({
  Header: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/shared/components/profile-dropdown", () => ({
  ProfileDropdown: () => null,
}));

vi.mock("@/shared/components/theme-switch", () => ({
  ThemeSwitch: () => null,
}));

vi.mock("@repo/client-core", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@repo/client-core")>();
  return {
    ...actual,
    useCreateReport: () => ({
      mutate: mockMutate,
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
  it("submits a topic and renders report history from client-core hooks", () => {
    render(<Dashboard />);

    expect(screen.getByText("TrendScout")).toBeInTheDocument();
    expect(screen.getAllByText("AI coding assistants")).toHaveLength(3);
    expect(screen.getByText("Sustainability score")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Research topic"), {
      target: { value: "Agentic coding" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Generate report" }));

    expect(mockMutate).toHaveBeenCalledWith({ topic: "Agentic coding" }, expect.any(Object));
  });
});
