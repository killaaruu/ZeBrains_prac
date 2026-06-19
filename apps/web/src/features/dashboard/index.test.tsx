import { marketNotFound, ruMarketNotFound, type Report } from "@repo/shared";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Dashboard } from "./index";

const mockNavigate = vi.fn();
const mockUseReportRealtime = vi.fn();

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
        sources: [
          "https://www.cursor.com",
          "https://www.anthropic.com/news/claude-3-5-sonnet",
        ],
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
    expect(screen.getByText("Sustainability score")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /generate report/i })).toBeInTheDocument();
    expect(screen.getAllByText("Готово").length).toBeGreaterThan(0);
    expect(screen.getByText("Status: done (Готово)")).toBeInTheDocument();
    expect(mockUseReportRealtime).toHaveBeenCalledWith(
      expect.objectContaining({
        reportId: "550e8400-e29b-41d4-a716-446655440000",
      }),
    );
  });

  it("renders the structured report view with clickable source links and honest empty states", () => {
    render(<Dashboard reportId="550e8400-e29b-41d4-a716-446655440000" />);

    expect(screen.getByText("Trend")).toBeInTheDocument();
    expect(screen.getByText("Global market")).toBeInTheDocument();
    expect(screen.getByText("RU market")).toBeInTheDocument();
    expect(screen.getByText("Arguments for")).toBeInTheDocument();
    expect(screen.getByText("Arguments against")).toBeInTheDocument();
    expect(screen.getByText("Cursor")).toBeInTheDocument();
    expect(screen.getByText("Anysphere")).toBeInTheDocument();
    expect(screen.getByText("Accelerates code review and boilerplate generation.")).toBeInTheDocument();
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
    expect(screen.getByText("Status: queued (В очереди)")).toBeInTheDocument();
    expect(
      screen.getByText("Report is queued for research. Live status updates will appear here."),
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
});
