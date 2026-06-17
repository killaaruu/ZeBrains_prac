import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Navbar } from "./Navbar";

describe("Navbar", () => {
  it("renders DDD and Modules tab links with hrefs", () => {
    render(<Navbar active="ddd" />);
    expect(screen.getByRole("link", { name: "DDD" })).toHaveAttribute("href", "#/ddd");
    expect(screen.getByRole("link", { name: "Modules" })).toHaveAttribute("href", "#/modules");
  });

  it("marks the active tab", () => {
    render(<Navbar active="modules" />);
    expect(screen.getByRole("link", { name: "Modules" }).className).toContain("is-active");
  });

  it("sets aria-current=page on the active tab and not on the inactive tab", () => {
    render(<Navbar active="modules" />);
    expect(screen.getByRole("link", { name: "Modules" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "DDD" })).not.toHaveAttribute("aria-current");
  });
});
