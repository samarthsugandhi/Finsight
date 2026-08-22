import { z } from "zod";

export const createTransactionSchema = z.object({
  body: z.object({
    amount: z.number().positive("Amount must be a positive number"),
    type: z.enum(["INCOME", "EXPENSE"]),
    categoryId: z.number().int(),
    description: z.string().trim().max(255).optional(),
    date: z.string().datetime().optional(),
  }),
});

export const listTransactionsSchema = z.object({
  query: z.object({
    month: z.coerce.number().int().min(1).max(12).optional(),
    year: z.coerce.number().int().min(2000).max(2100).optional(),
    type: z.enum(["INCOME", "EXPENSE"]).optional(),
    categoryId: z.coerce.number().int().optional(),
  }),
});

export type CreateTransactionInput = z.infer<typeof createTransactionSchema>["body"];

export const updateTransactionSchema = z.object({
  body: z.object({
    amount: z.number().positive("Amount must be a positive number").optional(),
    type: z.enum(["INCOME", "EXPENSE"]).optional(),
    categoryId: z.number().int().optional(),
    description: z.string().trim().max(255).optional().nullable(),
    date: z.string().datetime().optional(),
  }),
});

