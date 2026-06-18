import { type ReportMarketItem, ruMarketNotFound } from "@repo/shared";
import { describe, expect, it } from "vitest";
import { scoreSustainability } from "./sustainability-scorer";

const microsoftCopilot: ReportMarketItem = {
  product: "GitHub Copilot",
  company: "Microsoft",
  effects: "Improved developer throughput by 26% in internal pilot teams.",
  sources: ["https://example.com/copilot"],
};

const amazonQ: ReportMarketItem = {
  product: "Amazon Q",
  company: "Amazon",
  effects: "Cut onboarding time for support engineers by 18% across one division.",
  sources: ["https://example.com/amazon-q", "https://example.com/amazon-q-case-study"],
};

describe("scoreSustainability", () => {
  it("produces grounded arguments from validated global and RU findings", () => {
    const sustainability = scoreSustainability({
      globalMarket: [microsoftCopilot, amazonQ],
      ruMarket: [
        {
          product: "GigaCode",
          company: "Sber",
          effects: "Pilots report faster first-draft generation for routine code tasks.",
          sources: ["https://example.com/gigacode"],
        },
      ],
    });

    expect(sustainability.score).toBeGreaterThanOrEqual(7);
    expect(sustainability.score).toBeLessThanOrEqual(10);
    expect(sustainability.arguments_for).toEqual(
      expect.arrayContaining([
        expect.stringContaining("Microsoft"),
        expect.stringContaining("Sber"),
      ]),
    );
    expect(sustainability.arguments_against).toEqual(
      expect.arrayContaining([expect.stringContaining("qualitative")]),
    );
  });

  it("penalizes narrow evidence and missing RU implementations", () => {
    const sustainability = scoreSustainability({
      globalMarket: [
        {
          product: "Solo AI Assistant",
          company: "Solo Labs",
          effects: "Teams report faster drafting.",
          sources: ["https://example.com/solo"],
        },
      ],
      ruMarket: ruMarketNotFound,
    });

    expect(sustainability.score).toBeLessThanOrEqual(5);
    expect(sustainability.arguments_against).toEqual(
      expect.arrayContaining([
        expect.stringContaining("Russian"),
        expect.stringContaining("single company"),
      ]),
    );
  });
});
