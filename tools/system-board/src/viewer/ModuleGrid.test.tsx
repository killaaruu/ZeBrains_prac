import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { NestModule } from "../types";
import { ModuleGrid } from "./ModuleGrid";

const mod = (id: string, over: Partial<NestModule> = {}): NestModule => ({
  id,
  name: `${id}Module`,
  topLevel: id.split("/")[0]!,
  file: { name: "x.module.ts", path: `/repo/${id}.module.ts` },
  parentId: null,
  childIds: [],
  importIds: [],
  importExternal: [],
  tests: { total: 0, files: 0 },
  docs: [],
  architectureMd: "",
  status: null,
  integrations: [],
  ...over,
});

describe("ModuleGrid", () => {
  it("renders a minimal card per module linking to its detail route", () => {
    render(
      <ModuleGrid
        modules={[mod("dataos", { tests: { total: 12, files: 3 } }), mod("dataos/sync")]}
      />,
    );
    const link = screen.getByRole("link", { name: /dataosModule/ });
    expect(link).toHaveAttribute("href", "#/module/dataos");
    expect(screen.getByRole("link", { name: /syncModule|dataos\/sync/ })).toHaveAttribute(
      "href",
      "#/module/dataos/sync",
    );
    expect(screen.getByText(/12/)).toBeInTheDocument();
  });

  it("shows a count of modules", () => {
    render(<ModuleGrid modules={[mod("a"), mod("b")]} />);
    expect(screen.getByText(/2/)).toBeInTheDocument();
  });
});
