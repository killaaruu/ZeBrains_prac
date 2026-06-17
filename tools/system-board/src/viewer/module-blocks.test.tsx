import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { NestModule } from "../types";
import { ImportsBlock, SourceBlock, SubModulesBlock } from "./module-blocks";

const base: NestModule = {
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
  importIds: ["dataos/sync"],
  importExternal: ["ConfigModule"],
  tests: { total: 0, files: 0 },
  docs: [],
  architectureMd: "",
  status: null,
  integrations: [],
};

const byId = { "dataos/sync": "SyncModule" } as Record<string, string>;

describe("module-blocks", () => {
  it("SourceBlock links the module file via Zed", () => {
    render(<SourceBlock module={base} />);
    expect(screen.getByRole("link", { name: /dataos\.module\.ts/ })).toHaveAttribute(
      "href",
      "zed://file/repo/apps/api/src/modules/dataos/dataos.module.ts:3",
    );
  });

  it("SubModulesBlock links each child to its detail route", () => {
    render(<SubModulesBlock module={base} nameById={byId} />);
    expect(screen.getByRole("link", { name: /SyncModule|dataos\/sync/ })).toHaveAttribute(
      "href",
      "#/module/dataos/sync",
    );
  });

  it("ImportsBlock links resolved imports and shows external ones as plain text", () => {
    render(<ImportsBlock module={base} nameById={byId} />);
    expect(screen.getByRole("link", { name: /SyncModule|dataos\/sync/ })).toHaveAttribute(
      "href",
      "#/module/dataos/sync",
    );
    expect(screen.getByText("ConfigModule")).toBeInTheDocument();
  });
});
