import { SessionRepository } from '../repositories/session.repository';
import { UserRepository } from '../repositories/user.repository';
import { TokenService } from './token.service';
import { logger } from '../utils/logger';
import { UnauthorizedError, NotFoundError } from '../utils/errors';
import { Session } from '../db/schema';

export interface CreateSessionResult {
  sessionId: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}

export interface ValidateSessionResult {
  valid: boolean;
  userId?: string;
  sessionId?: string;
  email?: string;
  displayName?: string;
}

export class SessionService {
  private sessionRepo: SessionRepository;
  private userRepo: UserRepository;
  private tokenService: TokenService;
  private accessTokenTTL: number; // seconds
  private refreshTokenTTL: number; // seconds

  constructor(
    sessionRepo: SessionRepository,
    userRepo: UserRepository,
    tokenService: TokenService
  ) {
    this.sessionRepo = sessionRepo;
    this.userRepo = userRepo;
    this.tokenService = tokenService;
    
    // Default TTLs (can be configured via environment variables)
    this.accessTokenTTL = parseInt(process.env.ACCESS_TOKEN_TTL || '900'); // 15 minutes
    this.refreshTokenTTL = parseInt(process.env.REFRESH_TOKEN_TTL || '604800'); // 7 days
  }

  /**
   * Create new session with JWT and refresh token
   */
  async createSession(
    userId: string,
    userAgent?: string,
    ipAddress?: string
  ): Promise<CreateSessionResult> {
    try {
      // Verify user exists
      const user = await this.userRepo.getUserById(userId);
      if (!user) {
        throw new NotFoundError('User not found');
      }

      // Generate access token (JWT)
      const accessToken = this.tokenService.generateAccessToken({
        userId: user.id,
        email: user.email,
        displayName: user.display_name
      });

      // Generate refresh token (opaque token)
      const refreshToken = this.tokenService.generateRefreshToken();
      const refreshTokenHash = this.tokenService.hashToken(refreshToken);

      // Calculate expiration times
      const now = new Date();
      const expiresAt = new Date(now.getTime() + this.refreshTokenTTL * 1000);

      // Create session in database
      const session = await this.sessionRepo.createSession({
        userId: user.id,
        refreshTokenHash,
        expiresAt,
        userAgent: userAgent || null,
        ipAddress: ipAddress || null
      });

      logger.info('Session created successfully', {
        sessionId: session.id,
        userId: user.id
      });

      return {
        sessionId: session.id,
        accessToken,
        refreshToken,
        expiresAt
      };
    } catch (error) {
      logger.error('Failed to create session', {
        userId,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Validate JWT and session status
   */
  async validateSession(accessToken: string): Promise<ValidateSessionResult> {
    try {
      // Verify JWT signature and expiration
      const payload = this.tokenService.verifyAccessToken(accessToken);
      
      if (!payload) {
        return { valid: false };
      }

      // Verify user still exists
      const user = await this.userRepo.getUserById(payload.userId);
      if (!user) {
        logger.warn('Session validation failed: user not found', {
          userId: payload.userId
        });
        return { valid: false };
      }

      logger.info('Session validated successfully', {
        userId: payload.userId
      });

      return {
        valid: true,
        userId: payload.userId,
        email: payload.email,
        displayName: payload.displayName
      };
    } catch (error) {
      logger.error('Session validation error', {
        error: error instanceof Error ? error.message : String(error)
      });
      return { valid: false };
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshSession(
    refreshToken: string,
    sessionId: string
  ): Promise<CreateSessionResult> {
    try {
      // Hash the refresh token
      const refreshTokenHash = this.tokenService.hashToken(refreshToken);

      // Get session by refresh token hash
      const session = await this.sessionRepo.getSessionByRefreshToken(
        sessionId,
        refreshTokenHash
      );

      if (!session) {
        throw new UnauthorizedError('Invalid refresh token');
      }

      // Check if session is revoked
      if (session.revoked) {
        logger.warn('Attempted to refresh revoked session', {
          sessionId
        });
        throw new UnauthorizedError('Session has been revoked');
      }

      // Check if session is expired
      if (new Date() > session.expires_at) {
        logger.warn('Attempted to refresh expired session', {
          sessionId
        });
        throw new UnauthorizedError('Session has expired');
      }

      // Get user information
      const user = await this.userRepo.getUserById(session.user_id);
      if (!user) {
        throw new NotFoundError('User not found');
      }

      // Generate new access token
      const accessToken = this.tokenService.generateAccessToken({
        userId: user.id,
        email: user.email,
        displayName: user.display_name
      });

      // Generate new refresh token
      const newRefreshToken = this.tokenService.generateRefreshToken();
      const newRefreshTokenHash = this.tokenService.hashToken(newRefreshToken);

      // Update session with new refresh token
      await this.sessionRepo.updateSessionAccess(
        sessionId,
        newRefreshTokenHash
      );

      logger.info('Session refreshed successfully', {
        sessionId,
        userId: user.id
      });

      return {
        sessionId: session.id,
        accessToken,
        refreshToken: newRefreshToken,
        expiresAt: session.expires_at
      };
    } catch (error) {
      logger.error('Failed to refresh session', {
        sessionId,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Logout and revoke session
   */
  async terminateSession(sessionId: string, userId: string): Promise<void> {
    try {
      // Verify session belongs to user
      const session = await this.sessionRepo.getSessionById(sessionId);
      
      if (!session) {
        throw new NotFoundError('Session not found');
      }

      if (session.user_id !== userId) {
        throw new UnauthorizedError('Session does not belong to user');
      }

      // Revoke session
      await this.sessionRepo.revokeSession(sessionId);

      logger.info('Session terminated successfully', {
        sessionId,
        userId
      });
    } catch (error) {
      logger.error('Failed to terminate session', {
        sessionId,
        userId,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Logout all user sessions
   */
  async terminateAllSessions(userId: string): Promise<void> {
    try {
      // Revoke all user sessions
      await this.sessionRepo.revokeAllUserSessions(userId);

      logger.info('All sessions terminated successfully', {
        userId
      });
    } catch (error) {
      logger.error('Failed to terminate all sessions', {
        userId,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * List active sessions for user
   */
  async getUserSessions(userId: string): Promise<Session[]> {
    try {
      const sessions = await this.sessionRepo.getUserSessions(userId);

      logger.info('Retrieved user sessions', {
        userId,
        count: sessions.length
      });

      return sessions;
    } catch (error) {
      logger.error('Failed to get user sessions', {
        userId,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Cleanup expired sessions
   */
  async cleanupExpiredSessions(): Promise<void> {
    try {
      await this.sessionRepo.deleteExpiredSessions();
      logger.info('Expired sessions cleaned up');
    } catch (error) {
      logger.error('Failed to cleanup expired sessions', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }
}