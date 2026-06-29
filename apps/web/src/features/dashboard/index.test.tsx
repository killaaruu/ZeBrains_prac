import { marketNotFound, type Report, ruMarketNotFound } from "@repo/shared";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Dashboard } from "./index";

const mockNavigate = vi.fn();
const mockUseReportRealtime = vi.fn();
const mockDeleteMutate = vi.fn();

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

vi.mock("@tanstack/react-query", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-query")>();
  return {
    ...actual,
    useMutation: () => ({
      mutate: mockDeleteMutate,
      isPending: false,
    }),
  };
});

const reportList: Report[] = [
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
];

const selectedDoneReport: Report = {
  id: "550e8400-e29b-41d4-a716-446655440000",
  userId: "user-1",
  topic: "AI coding assistants",
  status: "done",
  result: {
    trend_name: "AI coding assistants",
    global_market: [
      {
        product: "Cursor",
        company: "Anysphere",
        effects: "Accelerates code review and boilerplate generation.",
        sources: ["https://www.cursor.com", "https://www.anthropic.com/news/claude-3-5-sonnet"],
      },
    ],
    ru_market: ruMarketNotFound,
    sustainability: {
      score: 8,
      arguments_for: ["Developer demand"],
      arguments_against: ["Evaluation complexity"],
    },
  },
  error: null,
  createdAt: "2026-06-17T12:00:00.000Z",
  updatedAt: "2026-06-17T12:05:00.000Z",
};

const mockUseReports = vi.fn();
const mockUseReport = vi.fn();

vi.mock("@repo/client-core", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@repo/client-core")>();
  return {
    ...actual,
    useCreateReport: () => ({
      mutateAsync: vi.fn(),
      isPending: false,
    }),
    useReports: (...args: Parameters<typeof mockUseReports>) => mockUseReports(...args),
    useReport: (...args: Parameters<typeof mockUseReport>) => mockUseReport(...args),
    useReportRealtime: (...args: Parameters<typeof mockUseReportRealtime>) =>
      mockUseReportRealtime(...args),
  };
});

describe("Dashboard", () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    mockUseReportRealtime.mockReset();
    mockDeleteMutate.mockReset();
    mockUseReports.mockReturnValue({
      data: reportList,
      isLoading: false,
      isError: false,
    });
    mockUseReport.mockReturnValue({
      data: selectedDoneReport,
      isLoading: false,
      isError: false,
    });
  });

  it("renders report history, selected report details, and the done status label", () => {
    render(<Dashboard reportId="550e8400-e29b-41d4-a716-446655440000" />);

    expect(screen.getByText("TrendScout")).toBeInTheDocument();
    expect(screen.getAllByText("AI coding assistants")).toHaveLength(3);
    expect(screen.getByText("Оценка устойчивости")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /сгенерировать отчёт/i })).toBeInTheDocument();
    expect(screen.getAllByText("Готово").length).toBeGreaterThan(0);
    expect(screen.getByText("Статус: done (Готово)")).toBeInTheDocument();
    expect(mockUseReportRealtime).toHaveBeenCalledWith(
      expect.objectContaining({
        reportId: "550e8400-e29b-41d4-a716-446655440000",
      }),
    );
  });

  it("renders the structured report view with clickable source links and honest empty states", () => {
    render(<Dashboard reportId="550e8400-e29b-41d4-a716-446655440000" />);

    expect(screen.getByText("Тренд")).toBeInTheDocument();
    expect(screen.getByText("Глобальный рынок")).toBeInTheDocument();
    expect(screen.getByText("Рынок РФ")).toBeInTheDocument();
    expect(screen.getByText("Аргументы за")).toBeInTheDocument();
    expect(screen.getByText("Аргументы против")).toBeInTheDocument();
    expect(screen.getByText("Cursor")).toBeInTheDocument();
    expect(screen.getByText("Anysphere")).toBeInTheDocument();
    expect(
      screen.getByText("Accelerates code review and boilerplate generation."),
    ).toBeInTheDocument();
    expect(screen.getByText(ruMarketNotFound)).toBeInTheDocument();

    const cursorLink = screen.getByRole("link", { name: "cursor.com" });
    expect(cursorLink).toHaveAttribute("href", "https://www.cursor.com");
    expect(cursorLink).toHaveAttribute("target", "_blank");

    const anthropicLink = screen.getByRole("link", { name: "anthropic.com" });
    expect(anthropicLink).toHaveAttribute(
      "href",
      "https://www.anthropic.com/news/claude-3-5-sonnet",
    );
    expect(anthropicLink).toHaveAttribute("target", "_blank");
  });

  it("renders queued state copy for an in-progress report", () => {
    mockUseReport.mockReturnValue({
      data: {
        ...selectedDoneReport,
        status: "queued",
        result: null,
      },
      isLoading: false,
      isError: false,
    });

    render(<Dashboard reportId="550e8400-e29b-41d4-a716-446655440000" />);

    expect(screen.getAllByText("В очереди").length).toBeGreaterThan(0);
    expect(screen.getByText("Статус: queued (В очереди)")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Отчёт поставлен в очередь на исследование. Живые обновления статуса появятся здесь.",
      ),
    ).toBeInTheDocument();
  });

  it("renders the honest not-found state for global and RU markets as-is", () => {
    mockUseReport.mockReturnValue({
      data: {
        ...selectedDoneReport,
        result: {
          ...selectedDoneReport.result!,
          global_market: marketNotFound,
          ru_market: ruMarketNotFound,
        },
      },
      isLoading: false,
      isError: false,
    });

    render(<Dashboard reportId="550e8400-e29b-41d4-a716-446655440000" />);

    expect(screen.getByText(marketNotFound)).toBeInTheDocument();
    expect(screen.getByText(ruMarketNotFound)).toBeInTheDocument();
  });

  it("collapses long market evidence with explicit expand and collapse actions", async () => {
    const user = userEvent.setup();
    const longEffects = Array.from({ length: 12 }, () => "Electric vehicles keep scaling.")
      .join(" ")
      .trim();

    mockUseReport.mockReturnValue({
      data: {
        ...selectedDoneReport,
        result: {
          ...selectedDoneReport.result!,
          global_market: [
            {
              product: "EV market overview",
              company: "Counterpoint",
              effects: longEffects,
              sources: ["https://example.com/ev-market"],
            },
          ],
        },
      },
      isLoading: false,
      isError: false,
    });

    render(<Dashboard reportId="550e8400-e29b-41d4-a716-446655440000" />);

    expect(screen.getByRole("button", { name: "Открыть полностью" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Свернуть" })).not.toBeInTheDocument();
    expect(screen.getByText(/Electric vehicles keep scaling/)).toHaveClass("line-clamp-4");

    await user.click(screen.getByRole("button", { name: "Открыть полностью" }));

    expect(screen.getByRole("button", { name: "Свернуть" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Открыть полностью" })).not.toBeInTheDocument();
    expect(screen.getByText(/Electric vehicles keep scaling/)).not.toHaveClass("line-clamp-4");

    await user.click(screen.getByRole("button", { name: "Свернуть" }));

    expect(screen.getByRole("button", { name: "Открыть полностью" })).toBeInTheDocument();
    expect(screen.getByText(/Electric vehicles keep scaling/)).toHaveClass("line-clamp-4");
  });

  it("filters report history, shows duration, and deletes reports", async () => {
    const user = userEvent.setup();
    mockUseReports.mockReturnValue({
      data: [
        selectedDoneReport,
        {
          ...selectedDoneReport,
          id: "report-2",
          topic: "Battery recycling",
          createdAt: "2026-06-17T12:00:00.000Z",
          updatedAt: "2026-06-17T12:02:30.000Z",
        },
      ],
      isLoading: false,
      isError: false,
    });

    render(<Dashboard reportId="550e8400-e29b-41d4-a716-446655440000" />);

    expect(screen.getByText("5m")).toBeInTheDocument();
    expect(screen.getByText("2m 30s")).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText("Найти отчет"), "battery");

    expect(screen.getByText("Battery recycling")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", {
        name: /AI coding assistants 2026-06-17T12:00:00.000Z Готово/i,
      }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Удалить отчет Battery recycling" }));
    expect(mockDeleteMutate).toHaveBeenCalledWith(
      "report-2",
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
  });
});
