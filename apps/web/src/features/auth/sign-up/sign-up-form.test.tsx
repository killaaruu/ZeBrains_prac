import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

let mockMutateAsync = vi.fn();
let mockIsPending = false;

vi.mock("../hooks/use-sign-up", () => ({
  useSignUp: () => ({
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

const { SignUpForm } = await import("./sign-up-form");

describe("SignUpForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMutateAsync = vi.fn();
    mockIsPending = false;
  });

  it("renders email, password, confirm password inputs and submit button", () => {
    render(React.createElement(SignUpForm));
    expect(screen.getByLabelText(/электронная почта/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^пароль$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/подтверждение пароля/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /создать аккаунт/i })).toBeInTheDocument();
  });

  it("shows validation errors for empty submit", async () => {
    render(React.createElement(SignUpForm));
    await userEvent.click(screen.getByRole("button", { name: /создать аккаунт/i }));
    expect(await screen.findByText(/введите email/i)).toBeInTheDocument();
    expect(await screen.findByText(/введите пароль/i)).toBeInTheDocument();
    expect(await screen.findByText(/подтвердите пароль/i)).toBeInTheDocument();
  });

  it("shows validation error for short password", async () => {
    render(React.createElement(SignUpForm));
    await userEvent.type(screen.getByLabelText(/электронная почта/i), "user@example.com");
    await userEvent.type(screen.getByLabelText(/^пароль$/i), "short");
    await userEvent.click(screen.getByRole("button", { name: /создать аккаунт/i }));
    expect(await screen.findByText(/минимум 8 символов/i)).toBeInTheDocument();
  });

  it("shows error when passwords do not match", async () => {
    render(React.createElement(SignUpForm));
    await userEvent.type(screen.getByLabelText(/электронная почта/i), "user@example.com");
    await userEvent.type(screen.getByLabelText(/^пароль$/i), "password123");
    await userEvent.type(screen.getByLabelText(/подтверждение пароля/i), "different123");
    await userEvent.click(screen.getByRole("button", { name: /создать аккаунт/i }));
    expect(await screen.findByText(/пароли не совпадают/i)).toBeInTheDocument();
  });

  it("calls mutateAsync with email and password on valid submit", async () => {
    mockMutateAsync.mockResolvedValue(undefined);
    render(React.createElement(SignUpForm));

    await userEvent.type(screen.getByLabelText(/электронная почта/i), "user@example.com");
    await userEvent.type(screen.getByLabelText(/^пароль$/i), "password123");
    await userEvent.type(screen.getByLabelText(/подтверждение пароля/i), "password123");
    await userEvent.click(screen.getByRole("button", { name: /создать аккаунт/i }));

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith({
        email: "user@example.com",
        password: "password123",
      });
    });
  });

  it("disables submit button while pending", () => {
    mockIsPending = true;
    render(React.createElement(SignUpForm));
    expect(screen.getByRole("button", { name: /создать аккаунт/i })).toBeDisabled();
  });
});
