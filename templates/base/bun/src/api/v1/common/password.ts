import { z } from "zod";

function hasUppercase(v: string) {
  return /[A-Z]/.test(v);
}
function hasDigit(v: string) {
  return /\d/.test(v);
}
function hasSymbol(v: string) {
  return /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(v);
}

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password must be at most 128 characters")
  .refine(hasUppercase, "Password must contain an uppercase letter")
  .refine(hasDigit, "Password must contain a digit")
  .refine(hasSymbol, "Password must contain a symbol");
