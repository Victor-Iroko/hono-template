import { z } from "zod";

export function requireAtLeastOne<T extends z.ZodRawShape>(schema: z.ZodObject<T>) {
  return schema.refine((value) => Object.values(value).some((item) => item !== undefined), {
    message: "At least one field must be provided",
  });
}
