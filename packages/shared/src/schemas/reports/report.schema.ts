import { z } from "zod";

export const ruMarketNotFound = "Реализации в РФ не обнаружено" as const;
export const marketNotFound = "Не найдено" as const;

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

export const reportMarketItemsOrNotFoundSchema = z.union([
  z.array(reportMarketItemSchema).min(1),
  z.literal(marketNotFound),
]);

export const reportRuMarketSchema = z.union([
  z.array(reportMarketItemSchema).min(1),
  z.literal(ruMarketNotFound),
  z.literal(marketNotFound),
]);

export const reportResultSchema = z.object({
  trend_name: z.string().min(1),
  global_market: reportMarketItemsOrNotFoundSchema,
  ru_market: reportRuMarketSchema,
  sustainability: reportSustainabilitySchema,
});

export type ReportResult = z.infer<typeof reportResultSchema>;

export const reportStatusSchema = z.enum(["queued", "thinking", "done", "error"]);

export type ReportStatus = z.infer<typeof reportStatusSchema>;

export const reportSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().min(1),
  topic: z.string().min(1),
  status: reportStatusSchema,
  result: reportResultSchema.nullable(),
  error: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type Report = z.infer<typeof reportSchema>;

export const createReportSchema = z.object({
  topic: z.string().trim().min(1).max(500),
});

export type CreateReport = z.infer<typeof createReportSchema>;
