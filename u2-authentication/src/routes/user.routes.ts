import { Router } from 'express';
import { UserController } from '../controllers/user.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { profileRateLimiter } from '../middleware/rate-limit.middleware';
import { asyncHandler } from '../middleware/error.middleware';
import { Pool } from 'pg';

/**
 * Create user routes
 * 
 * @param pool - Database connection pool
 * @returns Express router with user routes
 */
export function createUserRoutes(pool: Pool): Router {
  const router = Router();
  const userController = new UserController(pool);

  /**
   * GET /users/me
   * 
   * Get current user profile
   */
  router.get(
    '/me',
    requireAuth,
    profileRateLimiter,
    asyncHandler(userController.getCurrentUser.bind(userController))
  );

  /**
   * GET /users/me/sessions
   * 
   * List active sessions for current user
   */
  router.get(
    '/me/sessions',
    requireAuth,
    profileRateLimiter,
    asyncHandler(userController.getUserSessions.bind(userController))
  );

  return router;
}
