import { Request, Response, NextFunction } from "express";
import { chatOllama } from "@/ai/ollama.service";
import pdf = require("pdf-parse");
import { prisma } from "@/database/prisma";
import {
  getRecentTransactions,
  getMonthlySummary,
  getCategoryExpenses,
  getBudgets,
  getGoals,
  getAvailableSavings,
  getPortfolio,
  getCategories
} from "@/ai/tools/finance.tools";

const SYSTEM_PROMPT = `
You are Finsight, a personal finance assistant.
You have access to the following tools to fetch the user's financial data. You must ALWAYS use these tools to inspect data before answering any user question about their transactions, budgets, goals, or portfolio. Do not invent any numbers.

Available Tools:
1. get_recent_transactions: Fetch recent transactions. Parameters: { limit?: number }
2. get_monthly_summary: Fetch income, expense, savings, savings rate, and category summary. Parameters: { month?: number, year?: number }
3. get_category_expenses: Fetch expense category breakdown. Parameters: { month?: number, year?: number }
4. get_budgets: Fetch monthly budgets and spending progress. Parameters: { month?: number, year?: number }
5. get_goals: Fetch savings goals and progress (each goal's saved amount is the sum of its real contributions). Parameters: {}
6. get_portfolio: Fetch investment holdings, total value, returns, and allocations. Parameters: {}
7. get_available_savings: Fetch the user's current unallocated savings (total income minus total expenses minus what's already allocated to goals). Parameters: {}
8. get_categories: Fetch the full list of transaction categories with their id, name, and type (INCOME or EXPENSE). Parameters: {}

If you need to call a tool, you must reply with a JSON object:
{
  "tool": "tool_name",
  "parameters": { ... }
}

If you have enough information to answer (or after receiving tool results), you must reply with a JSON object:
{
  "response": "Your text answer to the user."
}

If the user wants to delete a transaction (destructive action), do NOT delete it. Instead, reply with a JSON object asking for confirmation:
{
  "response": "Are you sure you want to delete transaction ID X?",
  "actionRequired": {
    "type": "delete_transaction",
    "parameters": { "id": X }
  }
}

If the user asks you to add/log/record an income or expense (e.g. "add ₹200 expense for coffee", "log salary of ₹50000"), follow this exact sequence:
1. First call the get_categories tool if you have not already, so you can match the user's described category (e.g. "coffee" → "Food", "salary" → "Salary") to a real categoryId. Never guess or invent a categoryId — only use one that came from get_categories.
2. Once you have a matching categoryId, do NOT create the transaction yourself — there is no tool for that. Instead reply with a JSON object asking for confirmation:
{
  "response": "Add an expense of ₹200 for coffee under Food?",
  "actionRequired": {
    "type": "create_transaction",
    "parameters": { "type": "EXPENSE", "amount": 200, "categoryId": 3, "description": "coffee" }
  }
}
"type" must be exactly "INCOME" or "EXPENSE". "amount" must be a positive number. "categoryId" must be a real id from get_categories matching the same type. "description" is optional free text. If the user's message doesn't give enough detail to pick a category or amount confidently, ask a clarifying question in "response" instead of guessing, and omit actionRequired entirely.

You may SUGGEST how the user could allocate their available savings across their goals (e.g. "You have ₹2,000 unallocated — you could put ₹1,500 toward Emergency Fund and ₹500 toward Laptop"), but you must NEVER allocate savings yourself and there is no tool available for you to do so. Any allocation must be entered and confirmed by the user themselves on the Goals page.

You must ALWAYS output valid JSON. Do not include any text before or after the JSON block.
`;

export const aiController = {
  async chat(req: Request, res: Response, next: NextFunction) {
    try {
      const { message, history = [] } = req.body;

      if (!message || typeof message !== "string") {
        return res.status(400).json({ error: "Message is required" });
      }

      const currentMessages = [
        { role: "system", content: SYSTEM_PROMPT },
        ...history,
        { role: "user", content: message }
      ];

      let iterations = 0;
      const maxIterations = 5;

      while (iterations < maxIterations) {
        iterations++;
        const responseText = await chatOllama(currentMessages, true);

        let parsed;
        try {
          parsed = JSON.parse(responseText);
        } catch (e) {
          throw new Error("Failed to parse AI response as JSON: " + responseText);
        }

        if (parsed.tool) {
          const toolName = parsed.tool;
          const params = parsed.parameters || {};
          let result;

          try {
            switch (toolName) {
              case "get_recent_transactions":
                result = await getRecentTransactions(req.userId!, params.limit);
                break;
              case "get_monthly_summary":
                result = await getMonthlySummary(req.userId!, params.month, params.year);
                break;
              case "get_category_expenses":
                result = await getCategoryExpenses(req.userId!, params.month, params.year);
                break;
              case "get_budgets":
                result = await getBudgets(req.userId!, params.month, params.year);
                break;
              case "get_goals":
                result = await getGoals(req.userId!);
                break;
              case "get_available_savings":
                result = await getAvailableSavings(req.userId!);
                break;
              case "get_categories":
                result = await getCategories();
                break;
              case "get_portfolio":
                result = await getPortfolio(req.userId!);
                break;
              default:
                result = { error: `Tool ${toolName} not found` };
            }
          } catch (toolErr: any) {
            result = { error: toolErr.message || "Failed to execute tool" };
          }

          currentMessages.push({
            role: "assistant",
            content: responseText
          });
          currentMessages.push({
            role: "user",
            content: `Tool result from ${toolName}: ${JSON.stringify(result)}`
          });

          continue;
        }

        // Return final answer
        return res.json({
          answer: parsed.response || "",
          actionRequired: parsed.actionRequired || null,
          history: [
            ...history,
            { role: "user", content: message },
            { role: "assistant", content: responseText }
          ]
        });
      }

      res.status(500).json({ error: "AI agent exceeded maximum tool call iterations" });
    } catch (err) {
      next(err);
    }
  },

  async parseStatement(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No PDF statement file uploaded" });
      }

      const pdfData = await (pdf as any)(req.file.buffer);
      const text = pdfData.text;

      const prompt = `
You are Finsight, a bank statement parsing assistant.
Extract all individual transaction records from the following bank statement text.
Normalize and classify each transaction into:
- date: ISO datetime string (e.g. 2026-08-11T12:00:00.000Z)
- description: name/details of transaction
- type: "INCOME" or "EXPENSE"
- amount: positive number
- category: match against the database categories: Food, Rent, Transport, Shopping, Bills, Entertainment, Healthcare, Education, Travel, Salary, Freelance, Business, Investment, Interest, Bonus, Gift, Other Expense, Other Income.

Output only a valid JSON array of transactions matching this structure:
[
  {
    "date": "2026-08-11T12:00:00.000Z",
    "description": "Dinner at Restaurant",
    "type": "EXPENSE",
    "amount": 1250,
    "category": "Food"
  }
]

If no transactions are found, output an empty array [].
Do not include any conversational text or markdown blocks.

Statement Text:
${text}
`;

      const responseText = await chatOllama([{ role: "user", content: prompt }], true);

      let transactions = [];
      try {
        transactions = JSON.parse(responseText);
      } catch (e) {
        throw new Error("Failed to parse statement output: " + responseText);
      }

      res.json({ transactions });
    } catch (err) {
      next(err);
    }
  },

  async importStatement(req: Request, res: Response, next: NextFunction) {
    try {
      const { transactions = [] } = req.body;

      if (!Array.isArray(transactions)) {
        return res.status(400).json({ error: "Invalid transaction array payload" });
      }

      const dbCategories = await prisma.category.findMany();
      const catMap = new Map(dbCategories.map((c) => [c.name.toLowerCase(), c.id]));

      let importedCount = 0;

      // Use a database transaction to insert cleanly
      await prisma.$transaction(
        transactions.map((tx) => {
          const catName = (tx.category || "").toLowerCase();
          let categoryId = catMap.get(catName);

          if (!categoryId) {
            // Default category fallback
            const defaultName = tx.type === "INCOME" ? "other income" : "other expense";
            categoryId = catMap.get(defaultName) || dbCategories[0]?.id;
          }

          importedCount++;

          return prisma.transaction.create({
            data: {
              userId: req.userId!,
              amount: tx.amount,
              type: tx.type,
              description: tx.description,
              date: tx.date ? new Date(tx.date) : new Date(),
              categoryId: categoryId!,
            },
          });
        })
      );

      res.json({ success: true, count: importedCount });
    } catch (err) {
      next(err);
    }
  },
};