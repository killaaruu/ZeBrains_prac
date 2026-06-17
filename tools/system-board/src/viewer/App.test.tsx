import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { SystemMap } from "../types";
import { App } from "./App";

const map: SystemMap = {
  products: [],
  externalSystems: [],
  canvas: { nodes: [{ id: "dataos", label: "DataOS", kind: "product" }], edges: [] },
  modules: [
    {
      id: "dataos",
      name: "DataosModule",
      topLevel: "dataos",
      file: { name: "dataos.module.ts", path: "/repo/dataos.module.ts" },
      parentId: null,
      childIds: [],
      importIds: [],
      importExternal: [],
      tests: { total: 0, files: 0 },
      docs: [],
      architectureMd: "",
      status: null,
      integrations: [],
    },
  ],
  dddModules: [],
};

describe("App", () => {
  afterEach(() => {
    window.location.hash = "";
  });

  it("shows the navbar and the DDD index by default", () => {
    window.location.hash = "";
    render(<App map={map} />);
    expect(screen.getByRole("link", { name: "DDD" })).toBeInTheDocument();
    expect(screen.getByText(/DDD-модулей/)).toBeInTheDocument();
  });

  it("shows the module grid on #/modules", () => {
    window.location.hash = "#/modules";
    render(<App map={map} />);
    expect(screen.getByRole("link", { name: /DataosModule/ })).toHaveAttribute(
      "href",
      "#/module/dataos",
    );
  });

  it("shows the module detail on #/module/<id>", () => {
    window.location.hash = "#/module/dataos";
    render(<App map={map} />);
    expect(screen.getByRole("heading", { name: "DataosModule" })).toBeInTheDocument();
  });
});
