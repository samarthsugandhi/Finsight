import { Request, Response, NextFunction } from "express";

export class AppError extends Error {
  status: number;
  constructor(message: string, status = 500) {
    super(message);
    this.status = status;
  }
}

export function errorHandler(err: unknown, req: Request, res: Response, next: NextFunction) {
  console.error(err);

  if (err instanceof AppError) {
    return res.status(err.status).json({ error: err.message });
  }

  res.status(500).json({ error: "Internal server error" });
}
