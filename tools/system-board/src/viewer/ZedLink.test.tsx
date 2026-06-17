import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ZedLink, zedHref } from "./ZedLink";

describe("ZedLink", () => {
  it("renders a zed://file href with line when provided", () => {
    render(<ZedLink path="/repo/a.ts" line={12} label="a.ts" />);
    const link = screen.getByRole("link", { name: /a\.ts/ });
    expect(link).toHaveAttribute("href", "zed://file/repo/a.ts:12");
  });

  it("omits the line suffix when no line is given", () => {
    render(<ZedLink path="/repo/a.ts" label="a.ts" />);
    expect(screen.getByRole("link")).toHaveAttribute("href", "zed://file/repo/a.ts");
  });

  it("appends :0 when line is 0", () => {
    expect(zedHref("/repo/a.ts", 0)).toBe("zed://file/repo/a.ts:0");
  });

  it("warns and still builds href for a relative path", () => {
    const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const href = zedHref("rel/a.ts");
    expect(spy).toHaveBeenCalledWith(expect.stringContaining("rel/a.ts"));
    expect(href).toBe("zed://file/rel/a.ts");
    spy.mockRestore();
  });
});
