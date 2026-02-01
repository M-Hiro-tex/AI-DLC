import { Request, Response, NextFunction } from 'express';
import { validationResult, ValidationChain } from 'express-validator';
import { BadRequestError } from '../utils/errors';
import { logger } from '../utils/logger';

/**
 * Validation result handler middleware
 * 
 * Checks for validation errors and returns 400 Bad Request if found
 */
export const validate = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(err => ({
      field: err.type === 'field' ? err.path : 'unknown',
      message: err.msg
    }));
    
    logger.warn('Validation failed', {
      path: req.path,
      method: req.method,
      errors: errorMessages
    });
    
    res.status(400).json({
      error: 'Validation Error',
      message: 'Request validation failed',
      details: errorMessages
    });
    
    return;
  }
  
  next();
};

/**
 * Create validation middleware chain
 * 
 * @param validations - Array of validation chains
 * @returns Middleware array with validation and error handling
 */
export const validateRequest = (validations: ValidationChain[]) => {
  return [...validations, validate];
};
