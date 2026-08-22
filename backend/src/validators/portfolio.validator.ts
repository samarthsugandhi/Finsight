import { z } from "zod";

// Discriminated by type because the required fields genuinely differ:
// STOCK/CRYPTO need a symbol for live pricing; FIXED_DEPOSIT needs
// principal/interest/maturity fields and no symbol at all;
// MUTUAL_FUND/GOLD need neither (priced manually after creation).
export const addHoldingSchema = z.object({
  body: z.discriminatedUnion("type", [
    z.object({
      type: z.enum(["STOCK", "CRYPTO", "MUTUAL_FUND", "GOLD"]),
      name: z.string().trim().min(1),
      symbol: z.string().trim().optional().nullable(),
      quantity: z.number().positive(),
      averageBuyPrice: z.number().positive(),
    }),
    z.object({
      type: z.literal("FIXED_DEPOSIT"),
      name: z.string().trim().min(1),
      principal: z.number().positive(),
      interestRate: z.number().min(0).max(100).optional(),
      startDate: z.string().datetime().optional(),
      maturityDate: z.string().datetime().optional(),
      maturityAmount: z.number().positive().optional(),
    }),
  ]),
});

export type AddHoldingInput = z.infer<typeof addHoldingSchema>["body"];

export const addTransactionSchema = z.object({
  body: z.object({
    side: z.enum(["BUY", "SELL"]),
    quantity: z.number().positive(),
    price: z.number().positive(),
    date: z.string().datetime().optional(),
  }),
});

export type AddTransactionInput = z.infer<typeof addTransactionSchema>["body"];

export const updateManualPriceSchema = z.object({
  body: z.object({
    price: z.number().positive(),
  }),
});
