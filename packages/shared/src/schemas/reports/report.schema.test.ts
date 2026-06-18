import { describe, expect, it } from "vitest";
import {
  createReportSchema,
  reportResultSchema,
  reportSchema,
  reportStatusSchema,
} from "./report.schema";

const validMarketItem = {
  product: "AI coding assistant",
  company: "Example Labs",
  effects: "Reduced review turnaround by 30%",
  sources: ["https://example.com/source"],
};

const validReport = {
  trend_name: "AI-assisted software engineering",
  global_market: [validMarketItem],
  ru_market: [validMarketItem],
  sustainability: {
    score: 8,
    arguments_for: ["Clear productivity gains"],
    arguments_against: ["Quality depends on verification"],
  },
};

describe("reportResultSchema", () => {
  it("accepts a structured TrendScout report", () => {
    expect(reportResultSchema.parse(validReport)).toEqual(validReport);
  });

  it("accepts the explicit RU market not-found value", () => {
    expect(
      reportResultSchema.parse({
        ...validReport,
        ru_market: "Реализации в РФ не обнаружено",
      }).ru_market,
    ).toBe("Реализации в РФ не обнаружено");
  });

  it("requires at least one source per market item", () => {
    expect(() =>
      reportResultSchema.parse({
        ...validReport,
        global_market: [{ ...validMarketItem, sources: [] }],
      }),
    ).toThrow();
  });

  it("rejects malformed source URLs", () => {
    expect(() =>
      reportResultSchema.parse({
        ...validReport,
        global_market: [{ ...validMarketItem, sources: ["not-a-url"] }],
      }),
    ).toThrow();
  });

  it("limits the sustainability score to 1 through 10", () => {
    expect(() =>
      reportResultSchema.parse({
        ...validReport,
        sustainability: { ...validReport.sustainability, score: 0 },
      }),
    ).toThrow();
    expect(() =>
      reportResultSchema.parse({
        ...validReport,
        sustainability: { ...validReport.sustainability, score: 11 },
      }),
    ).toThrow();
  });

  it("rejects empty argument lists", () => {
    expect(() =>
      reportResultSchema.parse({
        ...validReport,
        sustainability: { ...validReport.sustainability, arguments_for: [] },
      }),
    ).toThrow();
  });
});

describe("createReportSchema", () => {
  it("accepts a non-empty topic", () => {
    expect(createReportSchema.parse({ topic: "AI coding assistants" })).toEqual({
      topic: "AI coding assistants",
    });
  });

  it("rejects an empty topic", () => {
    expect(() => createReportSchema.parse({ topic: "" })).toThrow();
  });
});

describe("reportStatusSchema", () => {
  it("accepts worker lifecycle statuses", () => {
    expect(reportStatusSchema.options).toEqual(["queued", "thinking", "done", "error"]);
  });
});

describe("reportSchema", () => {
  it("accepts queued reports without a result", () => {
    const report = {
      id: "00000000-0000-4000-8000-000000000000",
      userId: "user-1",
      topic: "AI coding assistants",
      status: "queued",
      result: null,
      error: null,
      createdAt: "2026-06-18T00:00:00.000Z",
      updatedAt: "2026-06-18T00:01:00.000Z",
    };

    expect(reportSchema.parse(report)).toEqual(report);
  });
});
