import { Request, Response, NextFunction } from "express";
import { portfolioService } from "@/services/portfolio.service";
import { env } from "@/config/env";

export const portfolioController = {
  async addHolding(req: Request, res: Response, next: NextFunction) {
    try {
      const holding = await portfolioService.addHolding(req.userId!, req.body);
      res.status(201).json({ holding });
    } catch (err) {
      next(err);
    }
  },

  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await portfolioService.list(req.userId!);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },

  async remove(req: Request, res: Response, next: NextFunction) {
    try {
      await portfolioService.remove(req.userId!, Number(req.params.id));
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },

  async addTransaction(req: Request, res: Response, next: NextFunction) {
    try {
      const transaction = await portfolioService.addTransaction(req.userId!, Number(req.params.id), req.body);
      res.status(201).json({ transaction });
    } catch (err) {
      next(err);
    }
  },

  async getTransactions(req: Request, res: Response, next: NextFunction) {
    try {
      const transactions = await portfolioService.getTransactions(req.userId!, Number(req.params.id));
      res.json({ transactions });
    } catch (err) {
      next(err);
    }
  },

  async updateManualPrice(req: Request, res: Response, next: NextFunction) {
    try {
      const holding = await portfolioService.updateManualPrice(req.userId!, Number(req.params.id), req.body.price);
      res.json({ holding });
    } catch (err) {
      next(err);
    }
  },

  async marketStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const status = await portfolioService.getMarketStatus(req.userId!);
      res.json({ status, refreshSeconds: env.MARKET_DATA_REFRESH_SECONDS });
    } catch (err) {
      next(err);
    }
  },
};
