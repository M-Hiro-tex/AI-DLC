import { Router } from 'express';
import { HealthController } from '../controllers/health.controller';
import { asyncHandler } from '../middleware/error.middleware';

/**
 * Create health routes
 * 
 * @returns Express router with health routes
 */
export function createHealthRoutes(): Router {
  const router = Router();
  const healthController = new HealthController();

  /**
   * GET /health
   * 
   * Health check endpoint for load balancers and monitoring
   */
  router.get(
    '/',
    asyncHandler(healthController.checkHealth.bind(healthController))
  );

  /**
   * GET /health/ready
   * 
   * Readiness probe for Kubernetes/ECS
   */
  router.get(
    '/ready',
    asyncHandler(healthController.checkReadiness.bind(healthController))
  );

  /**
   * GET /health/live
   * 
   * Liveness probe for Kubernetes/ECS
   */
  router.get(
    '/live',
    asyncHandler(healthController.checkLiveness.bind(healthController))
  );

  return router;
}
