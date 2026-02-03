import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

/**
 * Logging Middleware
 * 
 * Logs HTTP requests and responses for monitoring and debugging.
 * Uses Lambda Powertools logger for structured logging.
 */

/**
 * Request logging middleware
 * 
 * Logs all incoming requests with relevant metadata.
 */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const startTime = Date.now();

  // Log request
  logger.info('Incoming request', {
    method: req.method,
    path: req.path,
    query: req.query,
    userId: req.user?.id,
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });

  // Capture response
  const originalSend = res.json;
  res.json = function (data: any): Response {
    const duration = Date.now() - startTime;

    // Log response
    logger.info('Response sent', {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      userId: req.user?.id,
    });

    return originalSend.call(this, data);
  };

  next();
}

/**
 * Performance monitoring middleware
 * 
 * Logs slow requests for performance analysis.
 */
export function performanceMonitor(thresholdMs: number = 1000) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const startTime = Date.now();

    res.on('finish', () => {
      const duration = Date.now() - startTime;

      if (duration > thresholdMs) {
        logger.warn('Slow request detected', {
          method: req.method,
          path: req.path,
          duration: `${duration}ms`,
          threshold: `${thresholdMs}ms`,
          userId: req.user?.id,
        });
      }
    });

    next();
  };
}

/**
 * Request ID middleware
 * 
 * Adds a unique request ID to each request for tracing.
 */
export function requestId(req: Request, res: Response, next: NextFunction): void {
  const requestId = req.get('X-Request-ID') || generateRequestId();
  
  // Add to request object
  (req as any).requestId = requestId;
  
  // Add to response headers
  res.setHeader('X-Request-ID', requestId);
  
  // Add to logger context
  logger.addContext('requestId', requestId);

  next();
}

/**
 * Generate a unique request ID
 */
function generateRequestId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
}

/**
 * Security headers middleware
 * 
 * Adds security-related headers to responses.
 */
export function securityHeaders(req: Request, res: Response, next: NextFunction): void {
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');
  
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Enable XSS protection
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Strict transport security (HTTPS only)
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  
  next();
}
