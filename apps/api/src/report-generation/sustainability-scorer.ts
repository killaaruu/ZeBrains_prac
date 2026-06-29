import { type ReportMarketItem, type ReportSustainability, ruMarketNotFound } from "@repo/shared";

export interface SustainabilityScorerInput {
  topic?: string;
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

function isRussianTopic(topic: string | undefined): boolean {
  return Boolean(topic && /[А-Яа-яЁё]/u.test(topic));
}

export function scoreSustainability(input: SustainabilityScorerInput): ReportSustainability {
  const russian = isRussianTopic(input.topic);
  const ruMarketItems = input.ruMarket === ruMarketNotFound ? [] : input.ruMarket;
  const findings = [...input.globalMarket, ...ruMarketItems];
  const uniqueCompanies = unique(findings.map((item) => item.company));
  const quantifiedFindings = findings.filter((item) => METRIC_PATTERN.test(item.effects));
  const uniqueSources = unique(findings.flatMap((item) => item.sources));

  const argumentsFor: string[] = [];
  const argumentsAgainst: string[] = [];

  if (input.globalMarket.length >= 2) {
    argumentsFor.push(
      russian
        ? `Подтвержденный спрос виден у нескольких глобальных игроков, включая ${joinNames(
            unique(input.globalMarket.map((item) => item.company)).slice(0, 3),
          )}.`
        : `Validated demand appears across multiple global vendors, including ${joinNames(
            unique(input.globalMarket.map((item) => item.company)).slice(0, 3),
          )}.`,
    );
  }

  if (quantifiedFindings.length > 0) {
    argumentsFor.push(
      russian
        ? `В подтвержденных находках есть измеримые результаты, например ${joinNames(
            quantifiedFindings.map((item) => `${item.company}: ${item.product}`).slice(0, 2),
          )}.`
        : `Measured outcomes are present in validated findings, for example ${joinNames(
            quantifiedFindings.map((item) => `${item.company}'s ${item.product}`).slice(0, 2),
          )}.`,
    );
  }

  if (ruMarketItems.length > 0) {
    argumentsFor.push(
      russian
        ? `Подтверждение по рынку РФ не является чисто теоретическим: у ${joinNames(
            unique(ruMarketItems.map((item) => item.company)).slice(0, 2),
          )} уже есть локальные реализации.`
        : `Russian market validation is not purely theoretical: ${joinNames(
            unique(ruMarketItems.map((item) => item.company)).slice(0, 2),
          )} already show local implementations.`,
    );
  }

  if (uniqueSources.length >= 4) {
    argumentsFor.push(
      russian
        ? `Набор выводов опирается на ${uniqueSources.length} живых источников, а не на одну точку данных.`
        : `The finding set is supported by ${uniqueSources.length} live sources instead of a single reference point.`,
    );
  }

  if (input.ruMarket === ruMarketNotFound) {
    argumentsAgainst.push(
      russian
        ? "Подтвержденные находки не показали реализаций в РФ, что ослабляет аргумент в пользу устойчивости на локальном рынке."
        : "Validated findings did not surface Russian implementations, which weakens evidence for local market durability.",
    );
  }

  if (uniqueCompanies.length === 1) {
    argumentsAgainst.push(
      russian
        ? `Текущая доказательная база сконцентрирована вокруг одной компании (${uniqueCompanies[0]}), поэтому прогноз может искажаться её частными условиями.`
        : `The current evidence is concentrated in a single company (${uniqueCompanies[0]}), so vendor-specific conditions may skew the outlook.`,
    );
  }

  if (quantifiedFindings.length < findings.length) {
    argumentsAgainst.push(
      russian
        ? "Часть доказательной базы остаётся качественной и не подкреплена стабильными количественными метриками по всем подтвержденным находкам."
        : "Part of the evidence remains qualitative rather than backed by consistent hard metrics across all validated findings.",
    );
  }

  if (uniqueSources.length <= findings.length) {
    argumentsAgainst.push(
      russian
        ? "Покрытие источниками всё ещё относительно узкое по сравнению с числом находок, поэтому сигнал может быть ранним."
        : "Source coverage is still relatively thin compared with the number of findings, so the signal may be early.",
    );
  }

  if (argumentsFor.length === 0) {
    argumentsFor.push(
      uniqueCompanies.length > 0
        ? russian
          ? `Подтвержденные находки всё ещё показывают конкретное внедрение у ${joinNames(uniqueCompanies.slice(0, 2))}.`
          : `Validated findings still show concrete adoption for ${joinNames(uniqueCompanies.slice(0, 2))}.`
        : russian
          ? "Для этого тренда не нашлось подтвержденных рыночных находок, поэтому позитивный сигнал по устойчивости ограничен."
          : "No validated market findings surfaced for this trend, so positive sustainability signals are limited.",
    );
  }

  if (argumentsAgainst.length === 0) {
    argumentsAgainst.push(
      russian
        ? "Даже подтвержденная динамика может развернуться, если дальнейшие доказательства внедрения останутся ограниченными."
        : "Even validated traction can reverse if follow-on adoption evidence stays limited over time.",
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
