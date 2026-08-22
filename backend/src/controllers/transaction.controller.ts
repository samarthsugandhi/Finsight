import { Request, Response, NextFunction } from "express";
import { transactionService } from "@/services/transaction.service";

export const transactionController = {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const transaction = await transactionService.create(req.userId!, req.body);
      res.status(201).json({ transaction });
    } catch (err) {
      next(err);
    }
  },

  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const { month, year, period, type, categoryId } = req.query as {
        month?: string;
        year?: string;
        period?: string;
        type?: "INCOME" | "EXPENSE";
        categoryId?: string;
      };
      const transactions = await transactionService.list(req.userId!, {
        period,
        month: month ? Number(month) : undefined,
        year: year ? Number(year) : undefined,
        type,
        categoryId: categoryId ? Number(categoryId) : undefined,
      });
      res.json({ transactions });
    } catch (err) {
      next(err);
    }
  },

  async remove(req: Request, res: Response, next: NextFunction) {
    try {
      await transactionService.remove(req.userId!, Number(req.params.id));
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },

  async summary(req: Request, res: Response, next: NextFunction) {
    try {
      const { month, year, period } = req.query as { month?: string; year?: string; period?: string };
      const summary = await transactionService.summary(req.userId!, {
        period,
        month: month ? Number(month) : undefined,
        year: year ? Number(year) : undefined,
      });
      res.json(summary);
    } catch (err) {
      next(err);
    }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const transaction = await transactionService.update(
        req.userId!,
        Number(req.params.id),
        req.body
      );
      res.json({ transaction });
    } catch (err) {
      next(err);
    }
  },
};

