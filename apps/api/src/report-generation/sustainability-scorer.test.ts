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

  it("emits a clean fallback argument (no empty placeholder) when no findings exist", () => {
    const sustainability = scoreSustainability({
      globalMarket: [],
      ruMarket: ruMarketNotFound,
    });

    expect(sustainability.arguments_for.length).toBeGreaterThan(0);
    for (const argument of sustainability.arguments_for) {
      expect(argument.trim().length).toBeGreaterThan(0);
      expect(argument).not.toMatch(/for\s*\.\s*$/);
    }
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

  it("emits Russian sustainability arguments for a Russian topic", () => {
    const sustainability = scoreSustainability({
      topic: "Электромобили",
      globalMarket: [microsoftCopilot, amazonQ],
      ruMarket: [
        {
          product: "Москвич 3е",
          company: "Москвич",
          effects: "Продажи электромобиля уже запущены на локальном рынке.",
          sources: ["https://example.com/moskvich"],
        },
      ],
    });

    expect(sustainability.arguments_for.join(" ")).toMatch(/[А-Яа-яЁё]/u);
    expect(sustainability.arguments_against.join(" ")).toMatch(/[А-Яа-яЁё]/u);
    expect(sustainability.arguments_for.join(" ")).not.toMatch(/\bValidated\b|\bMeasured\b/u);
    expect(sustainability.arguments_against.join(" ")).not.toMatch(
      /\bRussian market\b|\bSource coverage\b/u,
    );
  });
});
