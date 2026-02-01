/**
 * Express Application Setup
 * 
 * Configures and exports the Express application with all middleware,
 * routes, and error handling. Can be used by both HTTP server and Lambda handler.
 */

import express, { Express, Request, Response } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import { getConfig } from './config';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';
import { requestLogger } from './middleware/logging.middleware';
import router from './routes';
import { logger } from './utils/logger';

/**
 * Create and configure Express application
 */
export function createApp(): Express {
  const app = express();
  const config = getConfig();

  // Trust proxy (important for rate limiting behind load balancers)
  app.set('trust proxy', 1);

  // Security middleware - Helmet sets various HTTP headers for security
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
  }));

  // CORS configuration
  app.use(cors({
    origin: config.cors.origin,
    credentials: config.cors.credentials,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Correlation-ID'],
    exposedHeaders: ['X-Correlation-ID'],
    maxAge: 86400, // 24 hours
  }));

  // Body parsing middleware
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Request logging middleware
  // Morgan for standard HTTP logging
  if (config.nodeEnv === 'development') {
    app.use(morgan('dev'));
  } else {
    app.use(morgan('combined'));
  }

  // Custom request logger with correlation IDs
  app.use(requestLogger);

  // Health check endpoint (before routes for quick response)
  app.get('/ping', (_req: Request, res: Response) => {
    res.status(200).json({ 
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  });

  // Mount API routes
  app.use('/api/v1', router);

  // 404 handler - must come after all other routes
  app.use(notFoundHandler);

  // Global error handler - must be last
  app.use(errorHandler);

  return app;
}

/**
 * Graceful shutdown handler
 * 
 * Properly closes all connections and cleans up resources
 */
export async function shutdown(
  server: any,
  signal: string
): Promise<void> {
  logger.info(`${signal} received. Starting graceful shutdown...`);

  // Stop accepting new connections
  server.close(() => {
    logger.info('HTTP server closed');
  });

  // Wait for existing connections to close (with timeout)
  const shutdownTimeout = setTimeout(() => {
    logger.error('Graceful shutdown timeout. Forcing exit.');
    process.exit(1);
  }, 30000); // 30 second timeout

  try {
    // Close database connections
    // Note: Database pool cleanup should be handled by the connection module
    logger.info('Closing database connections...');
    
    // TODO: Add database cleanup if needed
    // await pool.end();

    clearTimeout(shutdownTimeout);
    logger.info('Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    clearTimeout(shutdownTimeout);
    process.exit(1);
  }
}

/**
 * Export the Express application
 */
export default createApp();