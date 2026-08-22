import { Request, Response, NextFunction } from "express";
import { ZodType, ZodError } from "zod";

/**
 * Validates req.{body,query,params} against a Zod schema shaped like
 * { body: ..., query: ..., params: ... }. On success, replaces req.body
 * etc. with the parsed (and coerced) data. On failure, responds 400 with
 * a clear list of field-level errors.
 */
export function validate(schema: ZodType) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = schema.parse({
        body: req.body,
        query: req.query,
        params: req.params,
      }) as { body?: unknown; query?: unknown };
      if (parsed.body !== undefined) req.body = parsed.body;
      if (parsed.query !== undefined) req.query = parsed.query as typeof req.query;
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        return res.status(400).json({
          error: "Validation failed",
          details: err.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
        });
      }
      next(err);
    }
  };
}
