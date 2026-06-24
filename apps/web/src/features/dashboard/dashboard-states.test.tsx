import type { Report } from "@repo/shared";
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

const baseReport: Report = {
  id: "550e8400-e29b-41d4-a716-446655440000",
  userId: "user-1",
  topic: "AI coding assistants",
  status: "done",
  result: null,
  error: null,
  createdAt: "2026-06-17T12:00:00.000Z",
  updatedAt: "2026-06-17T12:00:00.000Z",
};

function setReportsState(state: { data?: Report[]; isLoading?: boolean; isError?: boolean }) {
  mockUseReports.mockReturnValue({
    data: state.data,
    isLoading: state.isLoading ?? false,
    isError: state.isError ?? false,
  });
}

function setReportState(data: Report | null) {
  mockUseReport.mockReturnValue({ data, isLoading: false, isError: false });
}

describe("Dashboard states", () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    mockUseReportRealtime.mockReset();
    mockDeleteMutate.mockReset();
    setReportsState({ data: [] });
    setReportState(null);
  });

  it("shows the loading copy while reports are loading", () => {
    setReportsState({ data: undefined, isLoading: true });

    render(<Dashboard reportId={null} />);

    expect(screen.getByText("Loading reports...")).toBeInTheDocument();
    expect(screen.getByText("0 reports")).toBeInTheDocument();
  });

  it("shows the error copy when the reports query fails", () => {
    setReportsState({ data: undefined, isError: true });

    render(<Dashboard reportId={null} />);

    expect(screen.getByText("Failed to load reports.")).toBeInTheDocument();
  });

  it("shows the empty-history copy when there are no reports", () => {
    setReportsState({ data: [] });

    render(<Dashboard reportId={null} />);

    expect(screen.getByText("No reports yet. Submit your first topic.")).toBeInTheDocument();
  });

  it("shows the no-selection copy when no report is selected", () => {
    setReportsState({ data: [] });
    setReportState(null);

    render(<Dashboard reportId={null} />);

    expect(screen.getByText("Select a report from history.")).toBeInTheDocument();
    expect(screen.getByText("No report selected yet.")).toBeInTheDocument();
    expect(screen.getByText("Latest report")).toBeInTheDocument();
  });

  it("auto-selects the first report when none is requested", () => {
    setReportsState({ data: [baseReport] });
    setReportState(null);

    render(<Dashboard reportId={null} />);

    expect(mockNavigate).toHaveBeenCalledWith({
      to: "/dashboard",
      search: { reportId: baseReport.id },
    });
  });

  it("does not auto-navigate when a report is already selected", () => {
    setReportsState({ data: [baseReport] });
    setReportState(baseReport);

    render(<Dashboard reportId={baseReport.id} />);

    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("renders the error report state with the report-specific error message", () => {
    const erroredReport: Report = {
      ...baseReport,
      status: "error",
      result: null,
      error: "Research pipeline crashed on source validation.",
    };
    setReportsState({ data: [erroredReport] });
    setReportState(erroredReport);

    render(<Dashboard reportId={erroredReport.id} />);

    expect(screen.getByText("Research pipeline crashed on source validation.")).toBeInTheDocument();
    expect(screen.getByText("Status: error (Ошибка)")).toBeInTheDocument();
    expect(screen.getAllByText("Ошибка").length).toBeGreaterThan(0);
  });

  it("falls back to default error copy when an errored report has no message", () => {
    const erroredReport: Report = {
      ...baseReport,
      status: "error",
      result: null,
      error: null,
    };
    setReportsState({ data: [erroredReport] });
    setReportState(erroredReport);

    render(<Dashboard reportId={erroredReport.id} />);

    expect(
      screen.getByText("Report generation failed. Try a different topic."),
    ).toBeInTheDocument();
  });

  it("shows the empty-filter copy when the filter matches nothing", async () => {
    const user = userEvent.setup();
    setReportsState({ data: [baseReport] });
    setReportState(baseReport);

    render(<Dashboard reportId={baseReport.id} />);

    await user.type(screen.getByPlaceholderText("Найти отчет"), "nonexistent-topic");

    expect(screen.getByText("Ничего не найдено по этому фильтру.")).toBeInTheDocument();
  });

  it("falls back to a report found in the list when the detail query has no data", () => {
    setReportsState({ data: [baseReport] });
    setReportState(null);

    render(<Dashboard reportId={baseReport.id} />);

    expect(screen.getByText("Status: done (Готово)")).toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("registers realtime updates for the active report id", () => {
    setReportsState({ data: [baseReport] });
    setReportState(baseReport);

    render(<Dashboard reportId={baseReport.id} />);

    expect(mockUseReportRealtime).toHaveBeenCalledWith(
      expect.objectContaining({ reportId: baseReport.id }),
    );
  });
});
