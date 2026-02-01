import { Response, NextFunction } from 'express';
import { UserService } from '../services/user.service';
import { SessionService } from '../services/session.service';
import { UserRepository } from '../repositories/user.repository';
import { SessionRepository } from '../repositories/session.repository';
import { TokenService } from '../services/token.service';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { UnauthorizedError } from '../utils/errors';
import { logger } from '../utils/logger';
import { Pool } from 'pg';

/**
 * User Controller
 * 
 * Handles user-related endpoints:
 * - Get current user profile
 * - List active sessions
 */
export class UserController {
  private userService: UserService;
  private sessionService: SessionService;

  constructor(pool: Pool) {
    const userRepo = new UserRepository(pool);
    const sessionRepo = new SessionRepository(pool);
    const tokenService = new TokenService();

    this.userService = new UserService(userRepo);
    this.sessionService = new SessionService(sessionRepo, userRepo, tokenService);
  }

  /**
   * GET /users/me
   * 
   * Get current user profile
   */
  async getCurrentUser(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) {
        throw new UnauthorizedError('User not authenticated');
      }

      logger.info('Fetching current user profile', {
        userId: req.user.userId
      });

      const user = await this.userService.getUserProfile(req.user.userId);

      res.json({
        user: {
          id: user.id,
          email: user.email,
          displayName: user.display_name,
          avatarUrl: user.avatar_url,
          oauthProvider: user.oauth_provider,
          lastLoginAt: user.last_login_at,
          createdAt: user.created_at,
          updatedAt: user.updated_at
        }
      });
    } catch (error) {
      logger.error('Failed to fetch user profile', {
        error: error instanceof Error ? error.message : String(error)
      });
      next(error);
    }
  }

  /**
   * GET /users/me/sessions
   * 
   * List active sessions for current user
   */
  async getUserSessions(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) {
        throw new UnauthorizedError('User not authenticated');
      }

      logger.info('Fetching user sessions', {
        userId: req.user.userId
      });

      const sessions = await this.sessionService.getUserSessions(req.user.userId);

      res.json({
        sessions: sessions.map(session => ({
          id: session.id,
          createdAt: session.created_at,
          lastAccessedAt: session.last_accessed_at,
          expiresAt: session.expires_at,
          ipAddress: session.ip_address,
          userAgent: session.user_agent
        }))
      });
    } catch (error) {
      logger.error('Failed to fetch user sessions', {
        error: error instanceof Error ? error.message : String(error)
      });
      next(error);
    }
  }
}
