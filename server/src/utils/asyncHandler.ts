import type { NextFunction, Request, RequestHandler, Response } from 'express';

/**
 * Envuelve un controlador (sync o async) y reenvía cualquier error a `next()`
 * para que lo procese el `errorHandler` global.
 */
export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => unknown): RequestHandler =>
  (req, res, next) => {
    Promise.resolve()
      .then(() => fn(req, res, next))
      .catch(next);
  };
