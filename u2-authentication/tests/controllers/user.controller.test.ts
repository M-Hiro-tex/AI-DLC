import { Response, NextFunction } from 'express';
import { UserController } from '../../src/controllers/user.controller';
import { AuthenticatedRequest } from '../../src/middleware/auth.middleware';
import { Pool } from 'pg';

/**
 * User Controller Tests
 */
describe('UserController', () => {
  let userController: UserController;
  let mockPool: jest.Mocked<Pool>;
  let mockRequest: Partial<AuthenticatedRequest>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    // Mock database pool
    mockPool = {
      query: jest.fn(),
      connect: jest.fn(),
      end: jest.fn()
    } as any;

    userController = new UserController(mockPool);

    // Mock authenticated request
    mockRequest = {
      user: {
        userId: 'test-user-id',
        email: 'test@example.com',
        displayName: 'Test User'
      },
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

  describe('GET /users/me', () => {
    it('should return current user profile', async () => {
      const mockUser = {
        id: 'test-user-id',
        email: 'test@example.com',
        display_name: 'Test User',
        avatar_url: 'https://example.com/avatar.jpg',
        oauth_provider: 'google',
        last_login_at: new Date('2026-02-01T00:00:00.000Z'),
        created_at: new Date('2026-01-01T00:00:00.000Z'),
        updated_at: new Date('2026-02-01T00:00:00.000Z')
      };

      jest.spyOn(userController['userService'], 'getUserProfile').mockResolvedValue(mockUser as any);

      await userController.getCurrentUser(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.json).toHaveBeenCalledWith({
        user: {
          id: 'test-user-id',
          email: 'test@example.com',
          displayName: 'Test User',
          avatarUrl: 'https://example.com/avatar.jpg',
          oauthProvider: 'google',
          lastLoginAt: mockUser.last_login_at,
          createdAt: mockUser.created_at,
          updatedAt: mockUser.updated_at
        }
      });
    });

    it('should fail without authentication', async () => {
      mockRequest.user = undefined;

      await userController.getCurrentUser(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });

    it('should handle user not found', async () => {
      jest.spyOn(userController['userService'], 'getUserProfile').mockRejectedValue(
        new Error('User not found')
      );

      await userController.getCurrentUser(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('GET /users/me/sessions', () => {
    it('should return active sessions', async () => {
      const mockSessions = [
        {
          id: 'session-1',
          created_at: new Date('2026-02-01T00:00:00.000Z'),
          last_accessed_at: new Date('2026-02-01T01:00:00.000Z'),
          expires_at: new Date('2026-02-08T00:00:00.000Z'),
          ip_address: '127.0.0.1',
          user_agent: 'Mozilla/5.0'
        },
        {
          id: 'session-2',
          created_at: new Date('2026-01-31T00:00:00.000Z'),
          last_accessed_at: new Date('2026-02-01T00:30:00.000Z'),
          expires_at: new Date('2026-02-07T00:00:00.000Z'),
          ip_address: '192.168.1.1',
          user_agent: 'Chrome/90.0'
        }
      ];

      jest.spyOn(userController['sessionService'], 'getUserSessions').mockResolvedValue(mockSessions as any);

      await userController.getUserSessions(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.json).toHaveBeenCalledWith({
        sessions: [
          {
            id: 'session-1',
            createdAt: mockSessions[0].created_at,
            lastAccessedAt: mockSessions[0].last_accessed_at,
            expiresAt: mockSessions[0].expires_at,
            ipAddress: '127.0.0.1',
            userAgent: 'Mozilla/5.0'
          },
          {
            id: 'session-2',
            createdAt: mockSessions[1].created_at,
            lastAccessedAt: mockSessions[1].last_accessed_at,
            expiresAt: mockSessions[1].expires_at,
            ipAddress: '192.168.1.1',
            userAgent: 'Chrome/90.0'
          }
        ]
      });
    });

    it('should fail without authentication', async () => {
      mockRequest.user = undefined;

      await userController.getUserSessions(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });

    it('should return empty array when no sessions', async () => {
      jest.spyOn(userController['sessionService'], 'getUserSessions').mockResolvedValue([]);

      await userController.getUserSessions(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.json).toHaveBeenCalledWith({
        sessions: []
      });
    });
  });
});
