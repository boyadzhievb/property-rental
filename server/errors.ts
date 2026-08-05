import type { Request, Response, NextFunction, RequestHandler } from 'express';
import { ZodError } from 'zod';
import { logger } from './logger.js';

export class AppError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message);
  }
}

export function notFound(resource: string): never {
  throw new AppError(404, `${resource} not found`);
}

export function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<void>): RequestHandler {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
}

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof ZodError) {
    logger.warn({ method: req.method, url: req.url, issues: err.issues }, 'Validation failed');
    res.status(400).json({ error: err.issues });
    return;
  }

  if (err instanceof AppError) {
    logger.warn({ method: req.method, url: req.url, statusCode: err.statusCode }, err.message);
    res.status(err.statusCode).json({ error: err.message });
    return;
  }

  logger.error({ err, method: req.method, url: req.url }, 'Unhandled error');
  res.status(500).json({ error: 'Internal server error' });
}
