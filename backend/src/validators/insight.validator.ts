import { z } from "zod";

export const askInsightSchema = z.object({
  body: z.object({
    question: z.string().trim().min(5, "Question must be at least 5 characters long"),
  }),
});

export type AskInsightInput = z.infer<typeof askInsightSchema>["body"];