import { getTableConfig } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";
import { reportStatusEnum, reports } from "./reports";

describe("reports schema", () => {
  it("defines the TrendScout reports table contract", () => {
    const table = getTableConfig(reports);
    const columnNames = table.columns.map((column) => column.name);
    const indexes = table.indexes.map((indexBuilder) => indexBuilder.config.name);

    expect(table.name).toBe("reports");
    expect(columnNames).toEqual([
      "id",
      "user_id",
      "topic",
      "status",
      "result",
      "error",
      "created_at",
      "updated_at",
    ]);
    expect(indexes).toContain("reports_user_id_idx");
    expect(indexes).toContain("reports_status_idx");
    expect(indexes).toContain("reports_created_at_idx");
  });

  it("limits report status values to the worker lifecycle states", () => {
    expect(reportStatusEnum.enumValues).toEqual(["queued", "thinking", "done", "error"]);
  });
});
