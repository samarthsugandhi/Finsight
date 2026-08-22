import { Request, Response, NextFunction } from "express";
import { goalService } from "@/services/goal.service";

export const goalController = {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const goal = await goalService.create(req.userId!, req.body);
      res.status(201).json({ goal });
    } catch (err) {
      next(err);
    }
  },

  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const goals = await goalService.list(req.userId!);
      res.json({ goals });
    } catch (err) {
      next(err);
    }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const goal = await goalService.update(req.userId!, Number(req.params.id), req.body);
      res.json({ goal });
    } catch (err) {
      next(err);
    }
  },

  async remove(req: Request, res: Response, next: NextFunction) {
    try {
      await goalService.remove(req.userId!, Number(req.params.id));
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },

  async availableSavings(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await goalService.getAvailableSavings(req.userId!);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },

  async allocate(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await goalService.allocate(req.userId!, req.body.allocations);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },

  async contributions(req: Request, res: Response, next: NextFunction) {
    try {
      const contributions = await goalService.getContributions(req.userId!, Number(req.params.id));
      res.json({ contributions });
    } catch (err) {
      next(err);
    }
  },
};
