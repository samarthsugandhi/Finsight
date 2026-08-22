import { z } from "zod";

export const upsertBudgetSchema = z.object({
  body: z.object({
    categoryId: z.number().int(),
    monthlyLimit: z.number().positive(),
    month: z.number().int().min(1).max(12),
    year: z.number().int().min(2000).max(2100),
  }),
});

export type UpsertBudgetInput = z.infer<typeof upsertBudgetSchema>["body"];
