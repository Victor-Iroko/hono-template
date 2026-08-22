import { z } from "zod";

export const cursorPaginationQuerySchema = z.object({
  cursor: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const CursorMetaSchema = z.object({
  next_cursor: z.string().nullable(),
  has_more: z.boolean(),
});

export const orderDirectionSchema = z.enum(["asc", "desc"]).default("desc");

export type CursorPaginationQuery = z.infer<typeof cursorPaginationQuerySchema>;
export type CursorMeta = z.infer<typeof CursorMetaSchema>;
export type OrderDirection = z.infer<typeof orderDirectionSchema>;
