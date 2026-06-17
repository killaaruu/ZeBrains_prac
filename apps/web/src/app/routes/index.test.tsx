import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const mockAuthState = vi.hoisted(() => ({
  user: null as unknown,
  isInitialized: true,
}));

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (config: unknown) => config,
  Navigate: ({ to }: { to: string }) => <div>navigate:{to}</div>,
}));

vi.mock("@/shared/stores/auth-store", () => ({
  useAuthStore: (selector: (state: typeof mockAuthState) => unknown) => selector(mockAuthState),
}));

const { IndexRedirect } = await import("./index");

describe("index route", () => {
  it("redirects authenticated users to the dashboard", () => {
    mockAuthState.user = { id: "user-1" };
    mockAuthState.isInitialized = true;

    render(<IndexRedirect />);

    expect(screen.getByText("navigate:/dashboard")).toBeInTheDocument();
  });

  it("redirects anonymous users to sign-in", () => {
    mockAuthState.user = null;
    mockAuthState.isInitialized = true;

    render(<IndexRedirect />);

    expect(screen.getByText("navigate:/sign-in")).toBeInTheDocument();
  });
});
