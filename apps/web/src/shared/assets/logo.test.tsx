import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Logo } from "./logo";

describe("Logo", () => {
  it("uses the TrendScout product title", () => {
    render(<Logo />);

    expect(screen.getByTitle("TrendScout")).toBeInTheDocument();
    expect(screen.queryByTitle("Logo")).not.toBeInTheDocument();
  });
});
