import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { logger } from '../utils/logger';

/**
 * Error Middleware
 * 
 * Centralized error handling middleware.
 * Catches and formats all errors, providing consistent error responses.
 */

/**
 * Custom error class for application errors
 */
export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public isOperational: boolean = true
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

/**
 * Error response interface
 */
interface ErrorResponse {
  error: string;
  message?: string;
  details?: any;
  stack?: string;
}

/**
 * Main error handling middleware
 * 
 * Should be registered as the last middleware in the Express app.
 */
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Log the error
  logger.error('Error occurred', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    userId: req.user?.id,
  });

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    const errorResponse: ErrorResponse = {
      error: 'Validation error',
      details: err.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      })),
    };

    res.status(400).json(errorResponse);
    return;
  }

  // Handle custom AppError
  if (err instanceof AppError) {
    const errorResponse: ErrorResponse = {
      error: err.message,
    };

    if (process.env.NODE_ENV === 'development') {
      errorResponse.stack = err.stack;
    }

    res.status(err.statusCode).json(errorResponse);
    return;
  }

  // Handle DynamoDB errors
  if (err.name === 'ResourceNotFoundException') {
    res.status(404).json({
      error: 'Resource not found',
    });
    return;
  }

  if (err.name === 'ConditionalCheckFailedException') {
    res.status(409).json({
      error: 'Conflict: Resource has been modified',
    });
    return;
  }

  if (err.name === 'ValidationException') {
    res.status(400).json({
      error: 'Invalid request data',
      message: err.message,
    });
    return;
  }

  // Default to 500 server error
  const errorResponse: ErrorResponse = {
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  };

  if (process.env.NODE_ENV === 'development') {
    errorResponse.stack = err.stack;
  }

  res.status(500).json(errorResponse);
}

/**
 * Not found error handler
 * 
 * Should be registered before the error handler middleware.
 */
export function notFoundHandler(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  const error = new AppError(404, `Route not found: ${req.method} ${req.path}`);
  next(error);
}

/**
 * Async error wrapper
 * 
 * Wraps async route handlers to automatically catch errors and pass to error middleware.
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// Export errorHandler as errorMiddleware for compatibility
export const errorMiddleware = errorHandler;
