// Augments Express's Request type so `req.userId` is recognized everywhere
// after the `requireAuth` middleware runs, without needing `as any` casts.
import "express";

declare global {
  namespace Express {
    interface Request {
      userId?: number;
    }
  }
}

export {};
