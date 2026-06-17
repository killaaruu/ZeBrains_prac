import { type ZodTypeAny, z } from "zod";

/** Generic offset/limit pagination query. */
export const paginationQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

/** Wrap any item schema into a `{ items, total }` paginated response shape. */
export const paginatedSchema = <T extends ZodTypeAny>(item: T) =>
  z.object({
    items: z.array(item),
    total: z.number().int().min(0),
  });
