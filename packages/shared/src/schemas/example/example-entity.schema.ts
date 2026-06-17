import { z } from "zod";

/**
 * Example domain entity — the template's demonstration of the end-to-end
 * Zod-contract pattern (ADR-004). Replace with your own product schemas.
 */
export const exampleEntitySchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(200),
  description: z.string().max(2000).nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type ExampleEntity = z.infer<typeof exampleEntitySchema>;

export const createExampleEntitySchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).nullable().optional(),
});

export type CreateExampleEntity = z.infer<typeof createExampleEntitySchema>;

export const updateExampleEntitySchema = createExampleEntitySchema.partial();

export type UpdateExampleEntity = z.infer<typeof updateExampleEntitySchema>;
