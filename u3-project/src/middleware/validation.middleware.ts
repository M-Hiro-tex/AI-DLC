import { Request, Response, NextFunction } from 'express';
import { ZodError, ZodSchema } from 'zod';
import { logger } from '../utils/logger';

/**
 * Validation Middleware
 * 
 * Uses Zod schemas to validate request body, params, and query.
 * Returns clear validation errors to the client.
 */

interface ValidationError {
  field: string;
  message: string;
}

/**
 * Format Zod errors into user-friendly format
 */
function formatZodErrors(error: ZodError): ValidationError[] {
  return error.errors.map((err) => ({
    field: err.path.join('.'),
    message: err.message,
  }));
}

/**
 * Middleware to validate request body against a Zod schema
 * 
 * @param schema Zod schema to validate against
 */
export function validateBody(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const validationErrors = formatZodErrors(error);
        logger.warn('Request body validation failed', { errors: validationErrors });
        res.status(400).json({
          error: 'Validation failed',
          details: validationErrors,
        });
      } else {
        next(error);
      }
    }
  };
}

/**
 * Middleware to validate request params against a Zod schema
 * 
 * @param schema Zod schema to validate against
 */
export function validateParams(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      schema.parse(req.params);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const validationErrors = formatZodErrors(error);
        logger.warn('Request params validation failed', { errors: validationErrors });
        res.status(400).json({
          error: 'Validation failed',
          details: validationErrors,
        });
      } else {
        next(error);
      }
    }
  };
}

/**
 * Middleware to validate request query against a Zod schema
 * 
 * @param schema Zod schema to validate against
 */
export function validateQuery(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const parsed = schema.parse(req.query);
      // Replace query with parsed (transformed) values
      req.query = parsed as any;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const validationErrors = formatZodErrors(error);
        logger.warn('Request query validation failed', { errors: validationErrors });
        res.status(400).json({
          error: 'Validation failed',
          details: validationErrors,
        });
      } else {
        next(error);
      }
    }
  };
}

/**
 * Combined validation middleware for body, params, and query
 * 
 * @param schemas Object containing schemas for body, params, and/or query
 */
export function validate(schemas: {
  body?: ZodSchema;
  params?: ZodSchema;
  query?: ZodSchema;
}) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      if (schemas.body) {
        schemas.body.parse(req.body);
      }
      if (schemas.params) {
        schemas.params.parse(req.params);
      }
      if (schemas.query) {
        const parsed = schemas.query.parse(req.query);
        req.query = parsed as any;
      }
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const validationErrors = formatZodErrors(error);
        logger.warn('Request validation failed', { errors: validationErrors });
        res.status(400).json({
          error: 'Validation failed',
          details: validationErrors,
        });
      } else {
        next(error);
      }
    }
  };
}
