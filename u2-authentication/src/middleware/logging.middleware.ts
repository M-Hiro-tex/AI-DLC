import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';

/**
 * Extended Express Request with correlation ID
 */
export interface RequestWithCorrelationId extends Request {
  correlationId?: string;
}

/**
 * Correlation ID middleware
 * 
 * Generates or extracts correlation ID for request tracing
 */
export const correlationId = (
  req: RequestWithCorrelationId,
  res: Response,
  next: NextFunction
): void => {
  // Try to get correlation ID from header, or generate new one
  const correlationId = 
    (req.headers['x-correlation-id'] as string) || 
    (req.headers['x-request-id'] as string) || 
    uuidv4();
  
  // Attach to request
  req.correlationId = correlationId;
  
  // Add to response headers
  res.setHeader('X-Correlation-ID', correlationId);
  
  next();
};

/**
 * Request logging middleware
 * 
 * Logs incoming HTTP requests
 */
export const requestLogger = (
  req: RequestWithCorrelationId,
  res: Response,
  next: NextFunction
): void => {
  const startTime = Date.now();
  
  // Log request
  logger.info('Incoming request', {
    method: req.method,
    path: req.path,
    query: req.query,
    correlationId: req.correlationId,
    ip: req.ip,
    userAgent: req.headers['user-agent']
  });
  
  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    
    const logData = {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration,
      correlationId: req.correlationId,
      ip: req.ip
    };
    
    if (res.statusCode >= 500) {
      logger.error('Request completed with server error', logData);
    } else if (res.statusCode >= 400) {
      logger.warn('Request completed with client error', logData);
    } else {
      logger.info('Request completed successfully', logData);
    }
  });
  
  next();
};

/**
 * Combined logging middleware
 * 
 * Applies correlation ID and request logging
 */
export const loggingMiddleware = [correlationId, requestLogger];
