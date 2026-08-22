import { z } from "zod";

export const createGoalSchema = z.object({
  body: z.object({
    title: z.string().trim().min(1),
    targetAmount: z.number().positive(),
    targetDate: z.string().datetime().optional(),
    isEmergencyFund: z.boolean().optional(),
  }),
});

export type CreateGoalInput = z.infer<typeof createGoalSchema>["body"];

export const updateGoalSchema = z.object({
  body: z.object({
    title: z.string().trim().min(1).optional(),
    targetAmount: z.number().positive().optional(),
    targetDate: z.string().datetime().optional().nullable(),
    isEmergencyFund: z.boolean().optional(),
  }),
});

// Goal progress is no longer set directly — it is always derived from real
// GoalContribution records created via the allocate endpoint below.
export const allocateSchema = z.object({
  body: z.object({
    allocations: z
      .array(
        z.object({
          goalId: z.number().int().positive(),
          amount: z.number().positive(),
          note: z.string().trim().max(280).optional(),
        })
      )
      .min(1, "At least one allocation is required"),
  }),
});

export type AllocateInput = z.infer<typeof allocateSchema>["body"];
