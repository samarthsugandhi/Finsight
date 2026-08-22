import { Request, Response, NextFunction } from "express";
import { budgetService } from "@/services/budget.service";

export const budgetController = {
  async upsert(req: Request, res: Response, next: NextFunction) {
    try {
      const budget = await budgetService.upsert(req.userId!, req.body);
      res.status(201).json({ budget });
    } catch (err) {
      next(err);
    }
  },

  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const { month, year, period } = req.query as { month?: string; year?: string; period?: string };
      const budgets = await budgetService.list(req.userId!, {
        period,
        month: month ? Number(month) : undefined,
        year: year ? Number(year) : undefined,
      });
      res.json({ budgets });
    } catch (err) {
      next(err);
    }
  },

  async remove(req: Request, res: Response, next: NextFunction) {
    try {
      await budgetService.remove(req.userId!, Number(req.params.id));
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },
};
