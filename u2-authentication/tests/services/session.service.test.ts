import { SessionService } from '../../src/services/session.service';
import { SessionRepository } from '../../src/repositories/session.repository';
import { UserRepository } from '../../src/repositories/user.repository';
import { TokenService } from '../../src/services/token.service';
import { UnauthorizedError, NotFoundError } from '../../src/utils/errors';

// Mock dependencies
jest.mock('../../src/repositories/session.repository');
jest.mock('../../src/repositories/user.repository');
jest.mock('../../src/services/token.service');

// Mock logger
jest.mock('../../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('SessionService', () => {
  let sessionService: SessionService;
  let mockSessionRepo: jest.Mocked<SessionRepository>;
  let mockUserRepo: jest.Mocked<UserRepository>;
  let mockTokenService: jest.Mocked<TokenService>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockSessionRepo = new SessionRepository(null as any) as jest.Mocked<SessionRepository>;
    mockUserRepo = new UserRepository(null as any) as jest.Mocked<UserRepository>;
    mockTokenService = new TokenService() as jest.Mocked<TokenService>;

    sessionService = new SessionService(
      mockSessionRepo,
      mockUserRepo,
      mockTokenService
    );
  });

  describe('createSession', () => {
    it('should create new session with tokens', async () => {
      // Arrange
      const userId = 'user-123';
      const mockUser = {
        id: userId,
        email: 'test@example.com',
        displayName: 'Test User',
        avatarUrl: null,
        oauthProvider: 'google' as const,
        oauthProviderId: 'google-123',
        createdAt: new Date(),
        lastLoginAt: new Date(),
      };

      const mockSession = {
        id: 'session-123',
        userId: userId,
        refreshTokenHash: 'hashed-token',
        expiresAt: new Date(Date.now() + 604800000),
        createdAt: new Date(),
        lastAccessedAt: new Date(),
        revokedAt: null,
        userAgent: null,
        ipAddress: null,
      };

      mockUserRepo.getUserById = jest.fn().mockResolvedValue(mockUser);
      mockTokenService.generateAccessToken = jest.fn().mockReturnValue('access-token');
      mockTokenService.generateRefreshToken = jest.fn().mockReturnValue('refresh-token');
      mockTokenService.hashToken = jest.fn().mockReturnValue('hashed-token');
      mockSessionRepo.createSession = jest.fn().mockResolvedValue(mockSession);

      // Act
      const result = await sessionService.createSession(userId);

      // Assert
      expect(result).toHaveProperty('sessionId', 'session-123');
      expect(result).toHaveProperty('accessToken', 'access-token');
      expect(result).toHaveProperty('refreshToken', 'refresh-token');
      expect(result).toHaveProperty('expiresAt');
      expect(mockUserRepo.getUserById).toHaveBeenCalledWith(userId);
      expect(mockSessionRepo.createSession).toHaveBeenCalled();
    });

    it('should throw NotFoundError for non-existent user', async () => {
      // Arrange
      const userId = 'non-existent';
      mockUserRepo.getUserById = jest.fn().mockResolvedValue(null);

      // Act & Assert
      await expect(
        sessionService.createSession(userId)
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('validateSession', () => {
    it('should validate correct JWT and return user info', async () => {
      // Arrange
      const accessToken = 'valid-jwt-token';
      const mockPayload = {
        userId: 'user-123',
        email: 'test@example.com',
        displayName: 'Test User',
      };
      const mockUser = {
        id: mockPayload.userId,
        email: mockPayload.email,
        displayName: mockPayload.displayName,
        avatarUrl: null,
        oauthProvider: 'google' as const,
        oauthProviderId: 'google-123',
        createdAt: new Date(),
        lastLoginAt: new Date(),
      };

      mockTokenService.verifyAccessToken = jest.fn().mockReturnValue(mockPayload);
      mockUserRepo.getUserById = jest.fn().mockResolvedValue(mockUser);

      // Act
      const result = await sessionService.validateSession(accessToken);

      // Assert
      expect(result.valid).toBe(true);
      expect(result.userId).toBe(mockPayload.userId);
      expect(result.email).toBe(mockPayload.email);
    });

    it('should return invalid for expired token', async () => {
      // Arrange
      const accessToken = 'expired-token';
      mockTokenService.verifyAccessToken = jest.fn().mockReturnValue(null);

      // Act
      const result = await sessionService.validateSession(accessToken);

      // Assert
      expect(result.valid).toBe(false);
    });

    it('should return invalid if user no longer exists', async () => {
      // Arrange
      const accessToken = 'valid-jwt-token';
      const mockPayload = {
        userId: 'user-123',
        email: 'test@example.com',
        displayName: 'Test User',
      };

      mockTokenService.verifyAccessToken = jest.fn().mockReturnValue(mockPayload);
      mockUserRepo.getUserById = jest.fn().mockResolvedValue(null);

      // Act
      const result = await sessionService.validateSession(accessToken);

      // Assert
      expect(result.valid).toBe(false);
    });
  });

  describe('refreshSession', () => {
    it('should refresh session and generate new tokens', async () => {
      // Arrange
      const refreshToken = 'valid-refresh-token';
      const sessionId = 'session-123';
      
      const mockSession = {
        id: sessionId,
        userId: 'user-123',
        refreshTokenHash: 'hashed-token',
        expiresAt: new Date(Date.now() + 604800000),
        createdAt: new Date(),
        lastAccessedAt: new Date(),
        revokedAt: null,
        userAgent: null,
        ipAddress: null,
      };

      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        displayName: 'Test User',
        avatarUrl: null,
        oauthProvider: 'google' as const,
        oauthProviderId: 'google-123',
        createdAt: new Date(),
        lastLoginAt: new Date(),
      };

      mockTokenService.hashToken = jest.fn().mockReturnValue('hashed-token');
      mockSessionRepo.getSessionByRefreshToken = jest.fn().mockResolvedValue(mockSession);
      mockUserRepo.getUserById = jest.fn().mockResolvedValue(mockUser);
      mockTokenService.generateAccessToken = jest.fn().mockReturnValue('new-access-token');
      mockTokenService.generateRefreshToken = jest.fn().mockReturnValue('new-refresh-token');
      mockSessionRepo.updateSessionAccess = jest.fn().mockResolvedValue(undefined);

      // Act
      const result = await sessionService.refreshSession(refreshToken, sessionId);

      // Assert
      expect(result.sessionId).toBe(sessionId);
      expect(result.accessToken).toBe('new-access-token');
      expect(result.refreshToken).toBe('new-refresh-token');
    });

    it('should throw UnauthorizedError for invalid refresh token', async () => {
      // Arrange
      const refreshToken = 'invalid-token';
      const sessionId = 'session-123';

      mockTokenService.hashToken = jest.fn().mockReturnValue('hashed-token');
      mockSessionRepo.getSessionByRefreshToken = jest.fn().mockResolvedValue(null);

      // Act & Assert
      await expect(
        sessionService.refreshSession(refreshToken, sessionId)
      ).rejects.toThrow(UnauthorizedError);
    });

    it('should throw UnauthorizedError for revoked session', async () => {
      // Arrange
      const refreshToken = 'valid-token';
      const sessionId = 'session-123';
      
      const revokedSession = {
        id: sessionId,
        userId: 'user-123',
        refreshTokenHash: 'hashed-token',
        expiresAt: new Date(Date.now() + 604800000),
        createdAt: new Date(),
        lastAccessedAt: new Date(),
        revokedAt: new Date(), // Session revoked
        userAgent: null,
        ipAddress: null,
      };

      mockTokenService.hashToken = jest.fn().mockReturnValue('hashed-token');
      mockSessionRepo.getSessionByRefreshToken = jest.fn().mockResolvedValue(revokedSession);

      // Act & Assert
      await expect(
        sessionService.refreshSession(refreshToken, sessionId)
      ).rejects.toThrow(UnauthorizedError);
    });
  });

  describe('terminateSession', () => {
    it('should revoke session for correct user', async () => {
      // Arrange
      const sessionId = 'session-123';
      const userId = 'user-123';

      const mockSession = {
        id: sessionId,
        userId: userId,
        refreshTokenHash: 'hashed-token',
        expiresAt: new Date(),
        createdAt: new Date(),
        lastAccessedAt: new Date(),
        revokedAt: null,
        userAgent: null,
        ipAddress: null,
      };

      mockSessionRepo.getSessionById = jest.fn().mockResolvedValue(mockSession);
      mockSessionRepo.revokeSession = jest.fn().mockResolvedValue(undefined);

      // Act
      await sessionService.terminateSession(sessionId, userId);

      // Assert
      expect(mockSessionRepo.revokeSession).toHaveBeenCalledWith(sessionId);
    });

    it('should throw UnauthorizedError if session belongs to different user', async () => {
      // Arrange
      const sessionId = 'session-123';
      const userId = 'user-123';
      const differentUserId = 'user-456';

      const mockSession = {
        id: sessionId,
        userId: differentUserId, // Different user
        refreshTokenHash: 'hashed-token',
        expiresAt: new Date(),
        createdAt: new Date(),
        lastAccessedAt: new Date(),
        revokedAt: null,
        userAgent: null,
        ipAddress: null,
      };

      mockSessionRepo.getSessionById = jest.fn().mockResolvedValue(mockSession);

      // Act & Assert
      await expect(
        sessionService.terminateSession(sessionId, userId)
      ).rejects.toThrow(UnauthorizedError);
    });
  });

  describe('terminateAllSessions', () => {
    it('should revoke all sessions for user', async () => {
      // Arrange
      const userId = 'user-123';
      mockSessionRepo.revokeAllUserSessions = jest.fn().mockResolvedValue(undefined);

      // Act
      await sessionService.terminateAllSessions(userId);

      // Assert
      expect(mockSessionRepo.revokeAllUserSessions).toHaveBeenCalledWith(userId);
    });
  });

  describe('getUserSessions', () => {
    it('should return all active sessions for user', async () => {
      // Arrange
      const userId = 'user-123';
      const mockSessions = [
        {
          id: 'session-1',
          userId: userId,
          refreshTokenHash: 'hash-1',
          expiresAt: new Date(),
          createdAt: new Date(),
          lastAccessedAt: new Date(),
          revokedAt: null,
          userAgent: 'Chrome',
          ipAddress: '1.2.3.4',
        },
        {
          id: 'session-2',
          userId: userId,
          refreshTokenHash: 'hash-2',
          expiresAt: new Date(),
          createdAt: new Date(),
          lastAccessedAt: new Date(),
          revokedAt: null,
          userAgent: 'Firefox',
          ipAddress: '5.6.7.8',
        },
      ];

      mockSessionRepo.getUserSessions = jest.fn().mockResolvedValue(mockSessions);

      // Act
      const result = await sessionService.getUserSessions(userId);

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('session-1');
      expect(result[1].id).toBe('session-2');
    });
  });

  describe('cleanupExpiredSessions', () => {
    it('should call repository cleanup method', async () => {
      // Arrange
      mockSessionRepo.deleteExpiredSessions = jest.fn().mockResolvedValue(undefined);

      // Act
      await sessionService.cleanupExpiredSessions();

      // Assert
      expect(mockSessionRepo.deleteExpiredSessions).toHaveBeenCalledTimes(1);
    });
  });
});