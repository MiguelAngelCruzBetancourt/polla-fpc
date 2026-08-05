import type { NextFunction, Request, RequestHandler, Response } from "express";

/** Express 4 no reenvía rechazos de promesas al error handler automáticamente. */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
): RequestHandler {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
}
