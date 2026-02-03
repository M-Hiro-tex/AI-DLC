import { Logger } from '@aws-lambda-powertools/logger';

/**
 * Lambda Powertools Logger Configuration
 * 
 * Provides structured logging with correlation IDs, context injection,
 * and CloudWatch integration.
 */

// Create logger instance
export const logger = new Logger({
  serviceName: process.env.SERVICE_NAME || 'u3-project',
  logLevel: (process.env.LOG_LEVEL as 'DEBUG' | 'INFO' | 'WARN' | 'ERROR') || 'INFO',
  persistentLogAttributes: {
    environment: process.env.NODE_ENV || 'development',
    version: process.env.APP_VERSION || '1.0.0'
  }
});

/**
 * Log with request context
 */
export function logWithContext(
  level: 'debug' | 'info' | 'warn' | 'error',
  message: string,
  context?: Record<string, any>
) {
  const logMethod = logger[level].bind(logger);
  logMethod(message, context);
}

/**
 * Log request details
 */
export function logRequest(
  method: string,
  path: string,
  userId?: string,
  additionalContext?: Record<string, any>
) {
  logger.info('Incoming request', {
    http: {
      method,
      path
    },
    userId,
    ...additionalContext
  });
}

/**
 * Log response details
 */
export function logResponse(
  method: string,
  path: string,
  statusCode: number,
  duration: number,
  userId?: string
) {
  logger.info('Response sent', {
    http: {
      method,
      path,
      statusCode
    },
    duration,
    userId
  });
}

/**
 * Log error with stack trace
 */
export function logError(
  error: Error,
  context?: Record<string, any>
) {
  logger.error('Error occurred', {
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack
    },
    ...context
  });
}

/**
 * Log business operation
 */
export function logOperation(
  operation: string,
  resource: string,
  resourceId: string,
  userId: string,
  success: boolean,
  details?: Record<string, any>
) {
  logger.info('Business operation', {
    operation,
    resource,
    resourceId,
    userId,
    success,
    ...details
  });
}

/**
 * Create child logger with additional context
 */
export function createChildLogger(
  additionalContext: Record<string, any>
): Logger {
  return logger.createChild({
    persistentLogAttributes: additionalContext
  });
}

/**
 * Add correlation ID to logger context
 */
export function addCorrelationId(correlationId: string): void {
  logger.appendKeys({
    correlationId
  });
}

/**
 * Remove correlation ID from logger context
 */
export function removeCorrelationId(): void {
  logger.removeKeys(['correlationId']);
}

export default logger;