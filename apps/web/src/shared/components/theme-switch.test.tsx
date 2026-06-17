import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ThemeSwitch } from "./theme-switch";

describe("ThemeSwitch", () => {
  it("renders no color theme switching UI", () => {
    const { container } = render(<ThemeSwitch />);

    expect(container).toBeEmptyDOMElement();
  });
});
