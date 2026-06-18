import { describe, expect, it } from "vitest";
import { reportKeys } from "./keys";

describe("reportKeys", () => {
  it("builds stable query keys", () => {
    expect(reportKeys.all).toEqual(["reports"]);
    expect(reportKeys.list()).toEqual(["reports", "list"]);
    expect(reportKeys.detail("report-123")).toEqual(["reports", "detail", "report-123"]);
  });
});
