import { Request, Response, NextFunction } from "express";
import { advisorService } from "@/services/advisor.service";

export const insightController = {
  async ask(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await advisorService.answer(req.userId!, req.body.question);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
};