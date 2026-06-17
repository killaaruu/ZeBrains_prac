import { z } from "zod";

/** Shape of a NestJS HTTP error body (matches the default exception filter). */
export const apiErrorSchema = z.object({
  statusCode: z.number().int(),
  message: z.union([z.string(), z.array(z.string())]),
  error: z.string().optional(),
});

export type ApiError = z.infer<typeof apiErrorSchema>;
