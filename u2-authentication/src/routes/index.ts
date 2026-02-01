import { Router } from 'express';
import { createAuthRoutes } from './auth.routes';
import { createUserRoutes } from './user.routes';
import { createHealthRoutes } from './health.routes';

/**
 * Create API routes
 * 
 * @returns Express router with all API routes
 */
export function createApiRoutes(): Router {
  const router = Router();

  // TODO: Remove Pool dependency - use RDS Data API directly
  // Temporary workaround: pass null as pool since we're using RDS Data API
  const pool = null as any;

  // Health routes (no authentication required)
  router.use('/health', createHealthRoutes());

  // Auth routes (OAuth, login, logout)
  router.use('/auth', createAuthRoutes(pool));

  // User routes (profile, sessions)
  router.use('/users', createUserRoutes(pool));

  return router;
}

/**
 * API version prefix
 */
export const API_VERSION = '/api/v1';

/**
 * Default router instance
 */
const router = createApiRoutes();

export default router;
