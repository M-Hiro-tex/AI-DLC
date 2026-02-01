import { Request, Response, NextFunction } from 'express';
import { OAuthService } from '../services/oauth.service';
import { SessionService } from '../services/session.service';
import { UserService } from '../services/user.service';
import { OAuthStateRepository } from '../repositories/oauth-state.repository';
import { SessionRepository } from '../repositories/session.repository';
import { UserRepository } from '../repositories/user.repository';
import { TokenService } from '../services/token.service';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { BadRequestError, UnauthorizedError } from '../utils/errors';
import { logger } from '../utils/logger';
import { getConfig } from '../config';
import { Pool } from 'pg';

/**
 * Auth Controller
 * 
 * Handles authentication endpoints:
 * - OAuth initiation (Google, GitHub)
 * - OAuth callback handling
 * - Token refresh
 * - Logout (single and all sessions)
 */
export class AuthController {
  private oauthService: OAuthService;
  private sessionService: SessionService;
  private userService: UserService;

  constructor(pool: Pool) {
    const oauthStateRepo = new OAuthStateRepository(pool);
    const sessionRepo = new SessionRepository(pool);
    const userRepo = new UserRepository(pool);
    const tokenService = new TokenService();

    this.oauthService = new OAuthService(oauthStateRepo, userRepo);
    this.sessionService = new SessionService(sessionRepo, userRepo, tokenService);
    this.userService = new UserService(userRepo);
  }

  /**
   * POST /auth/google/login
   * 
   * Initiate Google OAuth flow
   */
  async initiateGoogleLogin(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      logger.info('Initiating Google OAuth login', {
        ip: req.ip
      });

      const config = getConfig();
      const { authUrl } = await this.oauthService.generateAuthUrl(
        'google',
        config.oauth.google.redirectUri
      );

      res.json({
        authUrl,
        provider: 'google'
      });
    } catch (error) {
      logger.error('Failed to initiate Google login', {
        error: error instanceof Error ? error.message : String(error)
      });
      next(error);
    }
  }

  /**
   * GET /auth/google/callback
   * 
   * Handle Google OAuth callback
   */
  async handleGoogleCallback(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { code, state } = req.query;

      if (!code || typeof code !== 'string') {
        throw new BadRequestError('Authorization code is required');
      }

      if (!state || typeof state !== 'string') {
        throw new BadRequestError('State parameter is required');
      }

      logger.info('Processing Google OAuth callback', {
        hasCode: !!code,
        hasState: !!state
      });

      // Handle OAuth callback and get user info
      const config = getConfig();
      const userInfo = await this.oauthService.handleCallback(
        'google',
        code,
        state,
        config.oauth.google.redirectUri
      );

      // Create or update user
      const user = await this.userService.createOrUpdateUser(userInfo);

      // Create session
      const session = await this.sessionService.createSession(
        user.id,
        req.headers['user-agent'],
        req.ip
      );

      logger.info('Google OAuth login successful', {
        userId: user.id,
        sessionId: session.sessionId
      });

      res.json({
        accessToken: session.accessToken,
        refreshToken: session.refreshToken,
        expiresAt: session.expiresAt,
        user: {
          id: user.id,
          email: user.email,
          displayName: user.displayName,
          avatarUrl: user.avatarUrl
        }
      });
    } catch (error) {
      logger.error('Google OAuth callback failed', {
        error: error instanceof Error ? error.message : String(error)
      });
      next(error);
    }
  }

  /**
   * POST /auth/github/login
   * 
   * Initiate GitHub OAuth flow
   */
  async initiateGithubLogin(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      logger.info('Initiating GitHub OAuth login', {
        ip: req.ip
      });

      const config = getConfig();
      const { authUrl } = await this.oauthService.generateAuthUrl(
        'github',
        config.oauth.github.redirectUri
      );

      res.json({
        authUrl,
        provider: 'github'
      });
    } catch (error) {
      logger.error('Failed to initiate GitHub login', {
        error: error instanceof Error ? error.message : String(error)
      });
      next(error);
    }
  }

  /**
   * GET /auth/github/callback
   * 
   * Handle GitHub OAuth callback
   */
  async handleGithubCallback(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { code, state } = req.query;

      if (!code || typeof code !== 'string') {
        throw new BadRequestError('Authorization code is required');
      }

      if (!state || typeof state !== 'string') {
        throw new BadRequestError('State parameter is required');
      }

      logger.info('Processing GitHub OAuth callback', {
        hasCode: !!code,
        hasState: !!state
      });

      // Handle OAuth callback and get user info
      const config = getConfig();
      const userInfo = await this.oauthService.handleCallback(
        'github',
        code,
        state,
        config.oauth.github.redirectUri
      );

      // Create or update user
      const user = await this.userService.createOrUpdateUser(userInfo);

      // Create session
      const session = await this.sessionService.createSession(
        user.id,
        req.headers['user-agent'],
        req.ip
      );

      logger.info('GitHub OAuth login successful', {
        userId: user.id,
        sessionId: session.sessionId
      });

      res.json({
        accessToken: session.accessToken,
        refreshToken: session.refreshToken,
        expiresAt: session.expiresAt,
        user: {
          id: user.id,
          email: user.email,
          displayName: user.displayName,
          avatarUrl: user.avatarUrl
        }
      });
    } catch (error) {
      logger.error('GitHub OAuth callback failed', {
        error: error instanceof Error ? error.message : String(error)
      });
      next(error);
    }
  }

  /**
   * POST /auth/refresh
   * 
   * Refresh access token using refresh token
   */
  async refreshToken(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { refreshToken, sessionId } = req.body;

      if (!refreshToken || typeof refreshToken !== 'string') {
        throw new BadRequestError('Refresh token is required');
      }

      if (!sessionId || typeof sessionId !== 'string') {
        throw new BadRequestError('Session ID is required');
      }

      logger.info('Refreshing access token', {
        sessionId
      });

      const session = await this.sessionService.refreshSession(refreshToken, sessionId);

      logger.info('Token refreshed successfully', {
        sessionId: session.sessionId
      });

      res.json({
        accessToken: session.accessToken,
        refreshToken: session.refreshToken,
        expiresAt: session.expiresAt
      });
    } catch (error) {
      logger.error('Token refresh failed', {
        error: error instanceof Error ? error.message : String(error)
      });
      next(error);
    }
  }

  /**
   * POST /auth/logout
   * 
   * Logout and revoke current session
   */
  async logout(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { sessionId } = req.body;

      if (!req.user) {
        throw new UnauthorizedError('User not authenticated');
      }

      if (!sessionId || typeof sessionId !== 'string') {
        throw new BadRequestError('Session ID is required');
      }

      logger.info('User logging out', {
        userId: req.user.userId,
        sessionId
      });

      await this.sessionService.terminateSession(sessionId, req.user.userId);

      logger.info('User logged out successfully', {
        userId: req.user.userId,
        sessionId
      });

      res.json({
        message: 'Logged out successfully'
      });
    } catch (error) {
      logger.error('Logout failed', {
        error: error instanceof Error ? error.message : String(error)
      });
      next(error);
    }
  }

  /**
   * POST /auth/logout-all
   * 
   * Logout all sessions for the current user
   */
  async logoutAll(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) {
        throw new UnauthorizedError('User not authenticated');
      }

      logger.info('User logging out all sessions', {
        userId: req.user.userId
      });

      await this.sessionService.terminateAllSessions(req.user.userId);

      logger.info('All sessions logged out successfully', {
        userId: req.user.userId
      });

      res.json({
        message: 'All sessions logged out successfully'
      });
    } catch (error) {
      logger.error('Logout all failed', {
        error: error instanceof Error ? error.message : String(error)
      });
      next(error);
    }
  }
}
