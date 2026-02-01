import { Request, Response, NextFunction } from 'express';
import { AppError, formatErrorResponse } from '../utils/errors';
import { logger } from '../utils/logger';

/**
 * Global error handling middleware
 * Handles all errors thrown in the application
 */
export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // Log the error
  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      logger.error('Application error', {
        error: err.message,
        statusCode: err.statusCode,
        path: req.path,
        method: req.method,
        stack: err.stack
      });
    } else {
      logger.warn('Client error', {
        error: err.message,
        statusCode: err.statusCode,
        path: req.path,
        method: req.method
      });
    }
  } else {
    // Unexpected errors
    logger.error('Unexpected error', {
      error: err.message,
      path: req.path,
      method: req.method,
      stack: err.stack
    });
  }

  // Format and send error response
  const errorResponse = formatErrorResponse(err, req.path);
  const statusCode = err instanceof AppError ? err.statusCode : 500;

  res.status(statusCode).json(errorResponse);
};

/**
 * 404 Not Found handler
 * Handles requests to undefined routes
 */
export const notFoundHandler = (
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  logger.warn('Route not found', {
    path: req.path,
    method: req.method,
    ip: req.ip
  });

  res.status(404).json({
    error: {
      message: `Cannot ${req.method} ${req.path}`,
      statusCode: 404,
      timestamp: new Date().toISOString(),
      path: req.path
    }
  });
};

/**
 * Async error wrapper
 * Wraps async route handlers to catch errors and pass to error handler
 */
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
