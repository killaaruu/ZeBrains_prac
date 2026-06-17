import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { NestModule } from "../types";
import { ModuleDetail } from "./ModuleDetail";

const modules: NestModule[] = [
  {
    id: "dataos",
    name: "DataosModule",
    topLevel: "dataos",
    file: {
      name: "dataos.module.ts",
      path: "/repo/apps/api/src/modules/dataos/dataos.module.ts",
      line: 3,
    },
    parentId: null,
    childIds: ["dataos/sync"],
    importIds: [],
    importExternal: ["ConfigModule"],
    tests: { total: 12, files: 3 },
    docs: [{ title: "dataos-v2-prd.md", path: "/repo/docs/dataos-v2-prd.md" }],
    architectureMd: "# DataOS\n\nflow",
    status: "prod",
    integrations: [{ target: "supabase", kind: "storage" }],
  },
  {
    id: "dataos/sync",
    name: "SyncModule",
    topLevel: "dataos",
    file: { name: "sync.module.ts", path: "/repo/apps/api/src/modules/dataos/sync/sync.module.ts" },
    parentId: "dataos",
    childIds: [],
    importIds: [],
    importExternal: [],
    tests: { total: 1, files: 1 },
    docs: [],
    architectureMd: "",
    status: null,
    integrations: [],
  },
];

describe("ModuleDetail", () => {
  it("renders the module name, tests, curated architecture and a back link", () => {
    render(<ModuleDetail modules={modules} id="dataos" />);
    expect(screen.getByRole("heading", { name: "DataosModule" })).toBeInTheDocument();
    expect(screen.getByText(/12/)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "DataOS" })).toBeInTheDocument(); // markdown h1
    expect(screen.getByRole("link", { name: /Modules/ })).toHaveAttribute("href", "#/modules");
  });

  it("links sub-modules and resolved imports for drill-down", () => {
    render(<ModuleDetail modules={modules} id="dataos" />);
    expect(screen.getByRole("link", { name: /SyncModule|dataos\/sync/ })).toHaveAttribute(
      "href",
      "#/module/dataos/sync",
    );
  });

  it("shows a not-found message for an unknown id", () => {
    render(<ModuleDetail modules={modules} id="ghost" />);
    expect(screen.getByText(/не найден/)).toBeInTheDocument();
  });
});
