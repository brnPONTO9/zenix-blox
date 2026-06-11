import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128)
});

export const itemSchema = z.object({
  name: z.string().trim().min(2).max(80),
  imageUrl: z.string().trim().min(1).max(500),
  rarity: z.string().trim().min(2).max(40),
  probability: z.coerce.number().positive().max(100000),
  active: z.coerce.boolean().default(true)
});

export const keySchema = z.object({
  code: z.string().trim().min(3).max(80),
  label: z.string().trim().max(120).optional().nullable(),
  singleUse: z.coerce.boolean().default(true),
  active: z.coerce.boolean().default(true),
  expiresAt: z.string().datetime().optional().nullable().or(z.literal(""))
});

export const spinSchema = z.object({
  code: z.string().trim().min(3).max(80)
});

export function normalizeCode(code: string) {
  return code.trim().toUpperCase().replace(/\s+/g, "-");
}
