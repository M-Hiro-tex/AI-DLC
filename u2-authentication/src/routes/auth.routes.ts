import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { loginRateLimiter, refreshRateLimiter } from '../middleware/rate-limit.middleware';
import { asyncHandler } from '../middleware/error.middleware';
import { Pool } from 'pg';

/**
 * Create auth routes
 * 
 * @param pool - Database connection pool
 * @returns Express router with auth routes
 */
export function createAuthRoutes(pool: Pool): Router {
  const router = Router();
  const authController = new AuthController(pool);

  /**
   * POST /auth/google/login
   * 
   * Initiate Google OAuth flow
   */
  router.post(
    '/google/login',
    loginRateLimiter,
    asyncHandler(authController.initiateGoogleLogin.bind(authController))
  );

  /**
   * GET /auth/google/callback
   * 
   * Handle Google OAuth callback
   */
  router.get(
    '/google/callback',
    asyncHandler(authController.handleGoogleCallback.bind(authController))
  );

  /**
   * POST /auth/github/login
   * 
   * Initiate GitHub OAuth flow
   */
  router.post(
    '/github/login',
    loginRateLimiter,
    asyncHandler(authController.initiateGithubLogin.bind(authController))
  );

  /**
   * GET /auth/github/callback
   * 
   * Handle GitHub OAuth callback
   */
  router.get(
    '/github/callback',
    asyncHandler(authController.handleGithubCallback.bind(authController))
  );

  /**
   * POST /auth/refresh
   * 
   * Refresh access token using refresh token
   */
  router.post(
    '/refresh',
    refreshRateLimiter,
    asyncHandler(authController.refreshToken.bind(authController))
  );

  /**
   * POST /auth/logout
   * 
   * Logout and revoke current session
   */
  router.post(
    '/logout',
    requireAuth,
    asyncHandler(authController.logout.bind(authController))
  );

  /**
   * POST /auth/logout-all
   * 
   * Logout all sessions for current user
   */
  router.post(
    '/logout-all',
    requireAuth,
    asyncHandler(authController.logoutAll.bind(authController))
  );

  return router;
}
