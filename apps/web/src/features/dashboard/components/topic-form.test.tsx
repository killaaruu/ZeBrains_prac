import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockMutateAsync = vi.fn();
const mockNavigate = vi.fn();
let mockIsPending = false;

vi.mock("@repo/client-core", () => ({
  useCreateReport: () => ({
    mutateAsync: mockMutateAsync,
    isPending: mockIsPending,
  }),
}));

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => mockNavigate,
}));

const { TopicForm } = await import("./topic-form");

describe("TopicForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsPending = false;
  });

  it("shows a validation error when topic is empty", async () => {
    render(React.createElement(TopicForm));

    await userEvent.click(screen.getByRole("button", { name: /generate report/i }));

    expect(await screen.findByText(/at least 1 character/i)).toBeInTheDocument();
    expect(mockMutateAsync).not.toHaveBeenCalled();
  });

  it("creates a report and navigates to the report view", async () => {
    mockMutateAsync.mockResolvedValue({ id: "report-123" });

    render(React.createElement(TopicForm));

    await userEvent.type(screen.getByLabelText(/research topic/i), "  Agentic coding  ");
    await userEvent.click(screen.getByRole("button", { name: /generate report/i }));

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith({ topic: "Agentic coding" });
    });

    expect(mockNavigate).toHaveBeenCalledWith({
      to: "/dashboard",
      search: { reportId: "report-123" },
    });
  });

  it("disables submit while pending", () => {
    mockIsPending = true;

    render(React.createElement(TopicForm));

    expect(screen.getByRole("button", { name: /submitting/i })).toBeDisabled();
  });
});
