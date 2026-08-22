import { z } from "zod";
import { CursorMetaSchema, type CursorMeta } from "./pagination.js";

export const ErrorResponseSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    requestId: z.string().optional(),
    meta: z.record(z.unknown()).optional(),
  }),
});

export const SuccessResponseSchema = <T extends z.ZodTypeAny>(data: T) =>
  z.object({
    success: z.boolean(),
    data: data,
  });

export function successResponse<T>(data: T) {
  return { success: true, data } as const;
}

export const PaginatedSuccessResponseSchema = <T extends z.ZodTypeAny>(data: T) =>
  z.object({
    success: z.boolean(),
    data,
    meta: CursorMetaSchema,
  });

export function paginatedSuccessResponse<T>(data: T, meta: CursorMeta) {
  return { success: true, data, meta } as const;
}
