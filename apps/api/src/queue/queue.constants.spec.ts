import { describe, expect, it } from "vitest";
import {
  GENERATE_REPORT_JOB,
  type GenerateReportJobPayload,
  REPORT_GENERATION_QUEUE,
} from "./queue.constants";

describe("report generation queue contract", () => {
  it("uses the issue-defined queue and job names", () => {
    expect(REPORT_GENERATION_QUEUE).toBe("report-generation");
    expect(GENERATE_REPORT_JOB).toBe("generate-report");
  });

  it("carries the report id, user id, and topic", () => {
    const payload = {
      reportId: "00000000-0000-4000-8000-000000000000",
      userId: "11111111-1111-4111-8111-111111111111",
      topic: "AI coding assistants",
    } satisfies GenerateReportJobPayload;

    expect(payload).toEqual({
      reportId: "00000000-0000-4000-8000-000000000000",
      userId: "11111111-1111-4111-8111-111111111111",
      topic: "AI coding assistants",
    });
  });
});
