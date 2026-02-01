import { Request, Response, NextFunction } from 'express';
import { AuthController } from '../../src/controllers/auth.controller';
import { Pool } from 'pg';

/**
 * Auth Controller Tests
 */
describe('AuthController', () => {
  let authController: AuthController;
  let mockPool: jest.Mocked<Pool>;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    // Mock database pool
    mockPool = {
      query: jest.fn(),
      connect: jest.fn(),
      end: jest.fn()
    } as any;

    authController = new AuthController(mockPool);

    // Mock request and response
    mockRequest = {
      query: {},
      body: {},
      headers: {},
      ip: '127.0.0.1'
    };

    mockResponse = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis()
    };

    mockNext = jest.fn();
  });

  describe('POST /auth/google/login', () => {
    it('should return Google OAuth URL', async () => {
      await authController.initiateGoogleLogin(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          authUrl: expect.any(String),
          provider: 'google'
        })
      );
    });

    it('should handle errors', async () => {
      // Test error handling
      jest.spyOn(authController['oauthService'], 'generateAuthUrl').mockRejectedValue(
        new Error('OAuth service error')
      );

      await authController.initiateGoogleLogin(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('GET /auth/google/callback', () => {
    beforeEach(() => {
      mockRequest.query = {
        code: 'test-code',
        state: 'test-state'
      };
    });

    it('should handle successful OAuth callback', async () => {
      // Mock successful OAuth flow
      const mockUserInfo = {
        email: 'test@example.com',
        displayName: 'Test User',
        avatarUrl: 'https://example.com/avatar.jpg',
        providerId: 'google-123',
        provider: 'google' as const
      };

      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        displayName: 'Test User',
        avatarUrl: 'https://example.com/avatar.jpg'
      };

      const mockSession = {
        sessionId: 'session-123',
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        expiresAt: new Date('2026-02-02T00:00:00.000Z')
      };

      // Mock services
      jest.spyOn(authController['oauthService'], 'handleCallback').mockResolvedValue(mockUserInfo);
      jest.spyOn(authController['userService'], 'createOrUpdateUser').mockResolvedValue(mockUser as any);
      jest.spyOn(authController['sessionService'], 'createSession').mockResolvedValue(mockSession);

      await authController.handleGoogleCallback(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.json).toHaveBeenCalledWith({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        expiresAt: mockSession.expiresAt,
        user: {
          id: 'user-123',
          email: 'test@example.com',
          displayName: 'Test User',
          avatarUrl: 'https://example.com/avatar.jpg'
        }
      });
    });

    it('should fail with invalid state', async () => {
      mockRequest.query = {
        code: 'test-code',
        state: '' // Invalid state
      };

      await authController.handleGoogleCallback(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });

    it('should fail without authorization code', async () => {
      mockRequest.query = {
        state: 'test-state'
        // No code
      };

      await authController.handleGoogleCallback(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('POST /auth/refresh', () => {
    beforeEach(() => {
      mockRequest.body = {
        refreshToken: 'test-refresh-token',
        sessionId: 'test-session-id'
      };
    });

    it('should refresh access token successfully', async () => {
      const mockSession = {
        sessionId: 'test-session-id',
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        expiresAt: new Date('2026-02-02T00:00:00.000Z')
      };

      jest.spyOn(authController['sessionService'], 'refreshSession').mockResolvedValue(mockSession);

      await authController.refreshToken(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.json).toHaveBeenCalledWith({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        expiresAt: mockSession.expiresAt
      });
    });

    it('should fail with invalid refresh token', async () => {
      jest.spyOn(authController['sessionService'], 'refreshSession').mockRejectedValue(
        new Error('Invalid refresh token')
      );

      await authController.refreshToken(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });

    it('should fail without session ID', async () => {
      mockRequest.body = {
        refreshToken: 'test-refresh-token'
        // No sessionId
      };

      await authController.refreshToken(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('POST /auth/logout', () => {
    it('should logout successfully', async () => {
      const mockAuthRequest = mockRequest as any;
      mockAuthRequest.user = {
        userId: 'test-user-id',
        email: 'test@example.com',
        displayName: 'Test User'
      };
      mockAuthRequest.body = {
        sessionId: 'test-session-id'
      };

      jest.spyOn(authController['sessionService'], 'terminateSession').mockResolvedValue(undefined);

      await authController.logout(
        mockAuthRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Logged out successfully'
      });
      expect(authController['sessionService'].terminateSession).toHaveBeenCalledWith(
        'test-session-id',
        'test-user-id'
      );
    });

    it('should fail without authentication', async () => {
      mockRequest.body = {
        sessionId: 'test-session-id'
      };

      await authController.logout(
        mockRequest as any,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('POST /auth/logout-all', () => {
    it('should logout all sessions successfully', async () => {
      const mockAuthRequest = mockRequest as any;
      mockAuthRequest.user = {
        userId: 'test-user-id',
        email: 'test@example.com',
        displayName: 'Test User'
      };

      jest.spyOn(authController['sessionService'], 'terminateAllSessions').mockResolvedValue(undefined);

      await authController.logoutAll(
        mockAuthRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'All sessions logged out successfully'
      });
      expect(authController['sessionService'].terminateAllSessions).toHaveBeenCalledWith('test-user-id');
    });

    it('should fail without authentication', async () => {
      await authController.logoutAll(
        mockRequest as any,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });
  });
});
