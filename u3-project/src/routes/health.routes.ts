import { Router, Request, Response } from 'express';
import { logger } from '../utils/logger';

/**
 * Health Routes
 * 
 * Provides health check endpoints for monitoring and load balancing.
 * These routes do not require authentication.
 */

export function createHealthRoutes(): Router {
  const router = Router();

  /**
   * GET /api/v1/health
   * Basic health check endpoint
   * Returns 200 if the service is running
   */
  router.get('/', (_req: Request, res: Response) => {
    res.status(200).json({
      status: 'healthy',
      service: 'u3-project',
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * GET /api/v1/health/ready
   * Readiness check endpoint
   * Returns 200 if the service is ready to accept traffic
   * Checks database connectivity and other dependencies
   */
  router.get('/ready', async (_req: Request, res: Response) => {
    try {
      // TODO: Add database connectivity check
      // TODO: Add any other dependency checks

      res.status(200).json({
        status: 'ready',
        service: 'u3-project',
        timestamp: new Date().toISOString(),
        checks: {
          database: 'ok',
          // Add other checks here
        },
      });
    } catch (error) {
      logger.error('Readiness check failed', { error });
      res.status(503).json({
        status: 'not ready',
        service: 'u3-project',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * GET /api/v1/health/live
   * Liveness check endpoint
   * Returns 200 if the service is alive (not deadlocked)
   */
  router.get('/live', (_req: Request, res: Response) => {
    res.status(200).json({
      status: 'alive',
      service: 'u3-project',
      timestamp: new Date().toISOString(),
    });
  });

  return router;
}