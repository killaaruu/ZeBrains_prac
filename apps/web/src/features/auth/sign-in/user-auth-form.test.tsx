import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

let mockMutateAsync = vi.fn();
let mockIsPending = false;

vi.mock("../hooks/use-sign-in", () => ({
  useSignIn: () => ({
    mutateAsync: mockMutateAsync,
    isPending: mockIsPending,
    error: null,
  }),
}));

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => vi.fn(),
  Link: ({ children, to }: { children: React.ReactNode; to: string }) =>
    React.createElement("a", { href: to }, children),
}));

vi.mock("sonner", () => ({
  toast: { promise: vi.fn() },
}));

const { UserAuthForm } = await import("./user-auth-form");

describe("UserAuthForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMutateAsync = vi.fn();
    mockIsPending = false;
  });

  it("renders email, password inputs and submit button", () => {
    render(React.createElement(UserAuthForm));
    expect(screen.getByLabelText(/электронная почта/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/пароль/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /войти/i })).toBeInTheDocument();
  });

  it("renders forgot password link", () => {
    render(React.createElement(UserAuthForm));
    expect(screen.getByRole("link", { name: /забыли пароль/i })).toBeInTheDocument();
  });

  it("shows validation error for empty submit", async () => {
    render(React.createElement(UserAuthForm));
    await userEvent.click(screen.getByRole("button", { name: /войти/i }));
    expect(await screen.findByText(/введите email/i)).toBeInTheDocument();
    expect(await screen.findByText(/введите пароль/i)).toBeInTheDocument();
  });

  it("shows validation error for invalid email", async () => {
    render(React.createElement(UserAuthForm));
    await userEvent.type(screen.getByLabelText(/электронная почта/i), "notanemail");
    await userEvent.click(screen.getByRole("button", { name: /войти/i }));
    expect(await screen.findByText(/введите корректный email/i)).toBeInTheDocument();
  });

  it("shows validation error for short password", async () => {
    render(React.createElement(UserAuthForm));
    await userEvent.type(screen.getByLabelText(/электронная почта/i), "user@example.com");
    await userEvent.type(screen.getByLabelText(/пароль/i), "12345");
    await userEvent.click(screen.getByRole("button", { name: /войти/i }));
    expect(await screen.findByText(/минимум 7 символов/i)).toBeInTheDocument();
  });

  it("calls mutateAsync with email and password on valid submit", async () => {
    mockMutateAsync.mockResolvedValue(undefined);
    render(React.createElement(UserAuthForm));

    await userEvent.type(screen.getByLabelText(/электронная почта/i), "user@example.com");
    await userEvent.type(screen.getByLabelText(/пароль/i), "password123");
    await userEvent.click(screen.getByRole("button", { name: /войти/i }));

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith({
        email: "user@example.com",
        password: "password123",
      });
    });
  });

  it("disables submit button while pending", () => {
    mockIsPending = true;
    render(React.createElement(UserAuthForm));
    expect(screen.getByRole("button", { name: /войти/i })).toBeDisabled();
  });
});
