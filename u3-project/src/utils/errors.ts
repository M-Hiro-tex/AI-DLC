/**
 * Custom Error Classes
 * 
 * Standardized error types for the application with proper HTTP status codes
 * and error messages.
 */

/**
 * Base Application Error
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly context?: Record<string, any>;

  constructor(
    message: string,
    statusCode: number = 500,
    isOperational: boolean = true,
    context?: Record<string, any>
  ) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
    
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.context = context;
    
    Error.captureStackTrace(this);
  }
}

/**
 * 400 Bad Request - Client sent invalid data
 */
export class BadRequestError extends AppError {
  constructor(message: string = 'Bad Request', context?: Record<string, any>) {
    super(message, 400, true, context);
  }
}

/**
 * 401 Unauthorized - Authentication required or failed
 */
export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized', context?: Record<string, any>) {
    super(message, 401, true, context);
  }
}

/**
 * 403 Forbidden - User lacks permissions
 */
export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden', context?: Record<string, any>) {
    super(message, 403, true, context);
  }
}

/**
 * 404 Not Found - Resource doesn't exist
 */
export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource', resourceId?: string) {
    const message = resourceId 
      ? `${resource} with ID '${resourceId}' not found`
      : `${resource} not found`;
    super(message, 404, true, { resource, resourceId });
  }
}

/**
 * 409 Conflict - Resource conflict (e.g., duplicate)
 */
export class ConflictError extends AppError {
  constructor(message: string = 'Conflict', context?: Record<string, any>) {
    super(message, 409, true, context);
  }
}

/**
 * 422 Unprocessable Entity - Validation failed
 */
export class ValidationError extends AppError {
  public readonly errors: Array<{
    field: string;
    message: string;
    code?: string;
  }>;

  constructor(
    errors: Array<{ field: string; message: string; code?: string }>,
    message: string = 'Validation failed'
  ) {
    super(message, 422, true, { errors });
    this.errors = errors;
  }
}

/**
 * 429 Too Many Requests - Rate limit exceeded
 */
export class RateLimitError extends AppError {
  constructor(
    message: string = 'Too many requests',
    retryAfter?: number
  ) {
    super(message, 429, true, { retryAfter });
  }
}

/**
 * 500 Internal Server Error - Unexpected server error
 */
export class InternalServerError extends AppError {
  constructor(
    message: string = 'Internal server error',
    context?: Record<string, any>
  ) {
    super(message, 500, false, context);
  }
}

/**
 * 503 Service Unavailable - Service temporarily unavailable
 */
export class ServiceUnavailableError extends AppError {
  constructor(
    message: string = 'Service unavailable',
    context?: Record<string, any>
  ) {
    super(message, 503, true, context);
  }
}

/**
 * Database Error - Database operation failed
 */
export class DatabaseError extends AppError {
  constructor(
    message: string,
    operation: string,
    context?: Record<string, any>
  ) {
    super(message, 500, false, { operation, ...context });
  }
}

/**
 * External Service Error - Third-party service error
 */
export class ExternalServiceError extends AppError {
  constructor(
    service: string,
    message: string,
    context?: Record<string, any>
  ) {
    super(`External service error: ${service} - ${message}`, 502, true, {
      service,
      ...context
    });
  }
}

/**
 * Check if error is an operational error (expected)
 */
export function isOperationalError(error: Error): boolean {
  if (error instanceof AppError) {
    return error.isOperational;
  }
  return false;
}

/**
 * Convert error to API response format
 */
export function errorToResponse(error: AppError): {
  error: string;
  message: string;
  statusCode: number;
  context?: Record<string, any>;
  errors?: Array<{ field: string; message: string; code?: string }>;
} {
  const response: any = {
    error: error.name,
    message: error.message,
    statusCode: error.statusCode
  };

  // Add validation errors if present
  if (error instanceof ValidationError) {
    response.errors = error.errors;
  }

  // Add context in development mode
  if (process.env.NODE_ENV === 'development' && error.context) {
    response.context = error.context;
  }

  return response;
}

/**
 * Create error from Zod validation error
 */
export function createValidationErrorFromZod(zodError: any): ValidationError {
  const errors = zodError.errors.map((err: any) => ({
    field: err.path.join('.'),
    message: err.message,
    code: err.code
  }));

  return new ValidationError(errors);
}

/**
 * Wrap unknown error as AppError
 */
export function wrapError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error;
  }

  if (error instanceof Error) {
    return new InternalServerError(error.message, {
      originalError: error.name
    });
  }

  return new InternalServerError('An unknown error occurred');
}