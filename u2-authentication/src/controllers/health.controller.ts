import { Request, Response, NextFunction } from 'express';
import { checkHealth } from '../db/connection';
import { logger } from '../utils/logger';

/**
 * Health Controller
 * 
 * Handles health check endpoint:
 * - Database connectivity check
 * - Service status check
 */
export class HealthController {
  /**
   * GET /health
   * 
   * Health check endpoint for load balancers and monitoring
   */
  async checkHealth(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const startTime = Date.now();

      // Check database connectivity
      const dbHealthy = await checkHealth();

      const duration = Date.now() - startTime;

      const healthStatus = {
        status: dbHealthy ? 'healthy' : 'unhealthy',
        timestamp: new Date().toISOString(),
        service: 'authentication-service',
        version: process.env.APP_VERSION || '1.0.0',
        checks: {
          database: {
            status: dbHealthy ? 'up' : 'down',
            responseTime: duration
          }
        }
      };

      if (!dbHealthy) {
        logger.error('Health check failed - database unhealthy', {
          duration
        });
        res.status(503).json(healthStatus);
        return;
      }

      logger.debug('Health check passed', {
        duration
      });

      res.status(200).json(healthStatus);
    } catch (error) {
      logger.error('Health check error', {
        error: error instanceof Error ? error.message : String(error)
      });

      res.status(503).json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        service: 'authentication-service',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * GET /health/ready
   * 
   * Readiness probe for Kubernetes/ECS
   */
  async checkReadiness(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      // Check if service is ready to accept traffic
      const dbHealthy = await checkHealth();

      if (!dbHealthy) {
        logger.warn('Readiness check failed - database not ready');
        res.status(503).json({
          ready: false,
          reason: 'Database not ready'
        });
        return;
      }

      res.status(200).json({
        ready: true
      });
    } catch (error) {
      logger.error('Readiness check error', {
        error: error instanceof Error ? error.message : String(error)
      });

      res.status(503).json({
        ready: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * GET /health/live
   * 
   * Liveness probe for Kubernetes/ECS
   */
  async checkLiveness(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      // Simple liveness check - if we can respond, we're alive
      res.status(200).json({
        alive: true,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Liveness check error', {
        error: error instanceof Error ? error.message : String(error)
      });

      res.status(503).json({
        alive: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}
