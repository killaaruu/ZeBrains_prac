import { type ReportMarketItem, type ReportSustainability, ruMarketNotFound } from "@repo/shared";

export interface SustainabilityScorerInput {
  globalMarket: ReportMarketItem[];
  ruMarket: ReportMarketItem[] | typeof ruMarketNotFound;
}

const METRIC_PATTERN = /\b\d+(?:[.,]\d+)?\s?(?:%|percent|x|times|pts?|points?)\b/i;

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}

function joinNames(values: string[]): string {
  if (values.length <= 1) return values[0] ?? "";
  if (values.length === 2) return `${values[0]} and ${values[1]}`;
  return `${values.slice(0, -1).join(", ")}, and ${values.at(-1)}`;
}

function clampScore(score: number): number {
  return Math.min(10, Math.max(1, score));
}

export function scoreSustainability(input: SustainabilityScorerInput): ReportSustainability {
  const ruMarketItems = input.ruMarket === ruMarketNotFound ? [] : input.ruMarket;
  const findings = [...input.globalMarket, ...ruMarketItems];
  const uniqueCompanies = unique(findings.map((item) => item.company));
  const quantifiedFindings = findings.filter((item) => METRIC_PATTERN.test(item.effects));
  const uniqueSources = unique(findings.flatMap((item) => item.sources));

  const argumentsFor: string[] = [];
  const argumentsAgainst: string[] = [];

  if (input.globalMarket.length >= 2) {
    argumentsFor.push(
      `Validated demand appears across multiple global vendors, including ${joinNames(
        unique(input.globalMarket.map((item) => item.company)).slice(0, 3),
      )}.`,
    );
  }

  if (quantifiedFindings.length > 0) {
    argumentsFor.push(
      `Measured outcomes are present in validated findings, for example ${joinNames(
        quantifiedFindings.map((item) => `${item.company}'s ${item.product}`).slice(0, 2),
      )}.`,
    );
  }

  if (ruMarketItems.length > 0) {
    argumentsFor.push(
      `Russian market validation is not purely theoretical: ${joinNames(
        unique(ruMarketItems.map((item) => item.company)).slice(0, 2),
      )} already show local implementations.`,
    );
  }

  if (uniqueSources.length >= 4) {
    argumentsFor.push(
      `The finding set is supported by ${uniqueSources.length} live sources instead of a single reference point.`,
    );
  }

  if (input.ruMarket === ruMarketNotFound) {
    argumentsAgainst.push(
      "Validated findings did not surface Russian implementations, which weakens evidence for local market durability.",
    );
  }

  if (uniqueCompanies.length === 1) {
    argumentsAgainst.push(
      `The current evidence is concentrated in a single company (${uniqueCompanies[0]}), so vendor-specific conditions may skew the outlook.`,
    );
  }

  if (quantifiedFindings.length < findings.length) {
    argumentsAgainst.push(
      "Part of the evidence remains qualitative rather than backed by consistent hard metrics across all validated findings.",
    );
  }

  if (uniqueSources.length <= findings.length) {
    argumentsAgainst.push(
      "Source coverage is still relatively thin compared with the number of findings, so the signal may be early.",
    );
  }

  if (argumentsFor.length === 0) {
    argumentsFor.push(
      `Validated findings still show concrete adoption for ${joinNames(uniqueCompanies.slice(0, 2))}.`,
    );
  }

  if (argumentsAgainst.length === 0) {
    argumentsAgainst.push(
      "Even validated traction can reverse if follow-on adoption evidence stays limited over time.",
    );
  }

  // The score stays deterministic and grounded in the validated finding set until
  // the wider LangGraph pipeline lands. Breadth, quantified outcomes, live-source
  // depth, and RU-market presence increase confidence; concentration and gaps lower it.
  let score = 5;
  if (input.globalMarket.length >= 2) score += 1;
  if (findings.length >= 3) score += 1;
  if (uniqueCompanies.length >= 3) score += 1;
  if (uniqueCompanies.length === 1) score -= 1;
  if (quantifiedFindings.length >= 2) score += 2;
  else if (quantifiedFindings.length === 1) score += 1;
  else score -= 1;
  if (uniqueSources.length >= 4) score += 1;
  else if (uniqueSources.length <= 1) score -= 1;
  if (ruMarketItems.length > 0) score += 1;
  else score -= 2;

  return {
    score: clampScore(score),
    arguments_for: argumentsFor,
    arguments_against: argumentsAgainst,
  };
}
