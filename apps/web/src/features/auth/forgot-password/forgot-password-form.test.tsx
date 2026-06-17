import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

let mockMutateAsync = vi.fn();
let mockIsPending = false;

vi.mock("../hooks/use-forgot-password", () => ({
  useForgotPassword: () => ({
    mutateAsync: mockMutateAsync,
    isPending: mockIsPending,
    error: null,
  }),
}));

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: { promise: vi.fn() },
}));

const { ForgotPasswordForm } = await import("./forgot-password-form");

describe("ForgotPasswordForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMutateAsync = vi.fn();
    mockIsPending = false;
  });

  it("renders email input and submit button", () => {
    render(React.createElement(ForgotPasswordForm));
    expect(screen.getByLabelText(/электронная почта/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /продолжить/i })).toBeInTheDocument();
  });

  it("shows validation error for empty submit", async () => {
    render(React.createElement(ForgotPasswordForm));
    await userEvent.click(screen.getByRole("button", { name: /продолжить/i }));
    expect(await screen.findByText(/введите email/i)).toBeInTheDocument();
  });

  it("shows validation error for invalid email format", async () => {
    render(React.createElement(ForgotPasswordForm));
    await userEvent.type(screen.getByLabelText(/электронная почта/i), "notanemail");
    await userEvent.click(screen.getByRole("button", { name: /продолжить/i }));
    expect(await screen.findByText(/введите корректный email/i)).toBeInTheDocument();
  });

  it("calls mutateAsync with email on valid submit", async () => {
    mockMutateAsync.mockResolvedValue(undefined);
    render(React.createElement(ForgotPasswordForm));

    await userEvent.type(screen.getByLabelText(/электронная почта/i), "user@example.com");
    await userEvent.click(screen.getByRole("button", { name: /продолжить/i }));

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith({ email: "user@example.com" });
    });
  });

  it("disables submit button while pending", () => {
    mockIsPending = true;
    render(React.createElement(ForgotPasswordForm));
    expect(screen.getByRole("button", { name: /продолжить/i })).toBeDisabled();
  });
});
