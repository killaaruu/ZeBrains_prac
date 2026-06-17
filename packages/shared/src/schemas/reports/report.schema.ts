import { z } from "zod";

export const ruMarketNotFound = "Реализации в РФ не обнаружено" as const;

export const reportMarketItemSchema = z.object({
  product: z.string().min(1),
  company: z.string().min(1),
  effects: z.string().min(1),
  sources: z.array(z.string().url()).min(1),
});

export type ReportMarketItem = z.infer<typeof reportMarketItemSchema>;

export const reportSustainabilitySchema = z.object({
  score: z.number().int().min(1).max(10),
  arguments_for: z.array(z.string().min(1)).min(1),
  arguments_against: z.array(z.string().min(1)).min(1),
});

export type ReportSustainability = z.infer<typeof reportSustainabilitySchema>;

export const reportResultSchema = z.object({
  trend_name: z.string().min(1),
  global_market: z.array(reportMarketItemSchema).min(1),
  ru_market: z.union([z.array(reportMarketItemSchema).min(1), z.literal(ruMarketNotFound)]),
  sustainability: reportSustainabilitySchema,
});

export type ReportResult = z.infer<typeof reportResultSchema>;
