/**
 * Session Repository Unit Tests
 */

import { Pool } from 'pg';
import { SessionRepository } from '../../src/repositories/session.repository';
import { SessionCreateInput } from '../../src/db/schema';

// Mock logger
jest.mock('../../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('SessionRepository', () => {
  let mockPool: jest.Mocked<Pool>;
  let sessionRepository: SessionRepository;

  beforeEach(() => {
    mockPool = {
      query: jest.fn(),
    } as any;

    sessionRepository = new SessionRepository(mockPool);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createSession', () => {
    it('should create a new session successfully', async () => {
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
      const input: SessionCreateInput = {
        userId: 'user-uuid-123',
        refreshTokenHash: 'hashed-refresh-token',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        expiresAt,
      };

      const mockResult = {
        rows: [
          {
            id: 'session-uuid-123',
            user_id: 'user-uuid-123',
            refresh_token_hash: 'hashed-refresh-token',
            ip_address: '192.168.1.1',
            user_agent: 'Mozilla/5.0',
            expires_at: expiresAt,
            last_accessed_at: new Date(),
            revoked_at: null,
            created_at: new Date(),
          },
        ],
      };

      mockPool.query.mockResolvedValue(mockResult as any);

      const result = await sessionRepository.createSession(input);

      expect(result.userId).toBe('user-uuid-123');
      expect(result.refreshTokenHash).toBe('hashed-refresh-token');
      expect(result.ipAddress).toBe('192.168.1.1');
      expect(mockPool.query).toHaveBeenCalledTimes(1);
    });
  });

  describe('getSessionById', () => {
    it('should return session when found', async () => {
      const sessionId = 'session-uuid-123';
      const mockResult = {
        rows: [
          {
            id: sessionId,
            user_id: 'user-uuid-123',
            refresh_token_hash: 'hashed-token',
            ip_address: '192.168.1.1',
            user_agent: 'Mozilla/5.0',
            expires_at: new Date(),
            last_accessed_at: new Date(),
            revoked_at: null,
            created_at: new Date(),
          },
        ],
      };

      mockPool.query.mockResolvedValue(mockResult as any);

      const result = await sessionRepository.getSessionById(sessionId);

      expect(result).not.toBeNull();
      expect(result?.id).toBe(sessionId);
      expect(mockPool.query).toHaveBeenCalledWith('SELECT * FROM sessions WHERE id = $1', [
        sessionId,
      ]);
    });

    it('should return null when session not found', async () => {
      const sessionId = 'non-existent-session';
      const mockResult = { rows: [] };

      mockPool.query.mockResolvedValue(mockResult as any);

      const result = await sessionRepository.getSessionById(sessionId);

      expect(result).toBeNull();
    });
  });

  describe('getSessionByRefreshToken', () => {
    it('should return active session when found by refresh token', async () => {
      const refreshTokenHash = 'hashed-refresh-token';
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000); // Tomorrow

      const mockResult = {
        rows: [
          {
            id: 'session-uuid-123',
            user_id: 'user-uuid-123',
            refresh_token_hash: refreshTokenHash,
            ip_address: '192.168.1.1',
            user_agent: 'Mozilla/5.0',
            expires_at: futureDate,
            last_accessed_at: new Date(),
            revoked_at: null,
            created_at: new Date(),
          },
        ],
      };

      mockPool.query.mockResolvedValue(mockResult as any);

      const result = await sessionRepository.getSessionByRefreshToken(refreshTokenHash);

      expect(result).not.toBeNull();
      expect(result?.refreshTokenHash).toBe(refreshTokenHash);
    });

    it('should return null for expired or revoked sessions', async () => {
      const refreshTokenHash = 'expired-token';
      const mockResult = { rows: [] };

      mockPool.query.mockResolvedValue(mockResult as any);

      const result = await sessionRepository.getSessionByRefreshToken(refreshTokenHash);

      expect(result).toBeNull();
    });
  });

  describe('getUserSessions', () => {
    it('should return all active sessions for a user', async () => {
      const userId = 'user-uuid-123';
      const mockResult = {
        rows: [
          {
            id: 'session-1',
            user_id: userId,
            refresh_token_hash: 'hash-1',
            ip_address: '192.168.1.1',
            user_agent: 'Chrome',
            expires_at: new Date(),
            last_accessed_at: new Date(),
            revoked_at: null,
            created_at: new Date(),
            user_email: 'test@example.com',
            user_display_name: 'Test User',
            user_avatar_url: null,
            user_oauth_provider: 'google',
            user_oauth_provider_id: 'google-123',
            user_last_login_at: new Date(),
            user_created_at: new Date(),
            user_updated_at: new Date(),
          },
          {
            id: 'session-2',
            user_id: userId,
            refresh_token_hash: 'hash-2',
            ip_address: '192.168.1.2',
            user_agent: 'Firefox',
            expires_at: new Date(),
            last_accessed_at: new Date(),
            revoked_at: null,
            created_at: new Date(),
            user_email: 'test@example.com',
            user_display_name: 'Test User',
            user_avatar_url: null,
            user_oauth_provider: 'google',
            user_oauth_provider_id: 'google-123',
            user_last_login_at: new Date(),
            user_created_at: new Date(),
            user_updated_at: new Date(),
          },
        ],
      };

      mockPool.query.mockResolvedValue(mockResult as any);

      const result = await sessionRepository.getUserSessions(userId);

      expect(result).toHaveLength(2);
      expect(result[0].user.email).toBe('test@example.com');
    });
  });

  describe('updateSessionAccess', () => {
    it('should update last accessed timestamp', async () => {
      const sessionId = 'session-uuid-123';
      const mockResult = {
        rows: [
          {
            id: sessionId,
            user_id: 'user-uuid-123',
            refresh_token_hash: 'hashed-token',
            ip_address: '192.168.1.1',
            user_agent: 'Mozilla/5.0',
            expires_at: new Date(),
            last_accessed_at: new Date(),
            revoked_at: null,
            created_at: new Date(),
          },
        ],
      };

      mockPool.query.mockResolvedValue(mockResult as any);

      const result = await sessionRepository.updateSessionAccess(sessionId);

      expect(result.id).toBe(sessionId);
      expect(mockPool.query).toHaveBeenCalledTimes(1);
    });
  });

  describe('revokeSession', () => {
    it('should revoke a specific session', async () => {
      const sessionId = 'session-uuid-123';
      const now = new Date();

      const mockResult = {
        rows: [
          {
            id: sessionId,
            user_id: 'user-uuid-123',
            refresh_token_hash: 'hashed-token',
            ip_address: '192.168.1.1',
            user_agent: 'Mozilla/5.0',
            expires_at: new Date(),
            last_accessed_at: new Date(),
            revoked_at: now,
            created_at: new Date(),
          },
        ],
      };

      mockPool.query.mockResolvedValue(mockResult as any);

      const result = await sessionRepository.revokeSession(sessionId);

      expect(result.revokedAt).toEqual(now);
      expect(mockPool.query).toHaveBeenCalledTimes(1);
    });
  });

  describe('revokeAllUserSessions', () => {
    it('should revoke all sessions for a user', async () => {
      const userId = 'user-uuid-123';
      const mockResult = {
        rowCount: 3,
      };

      mockPool.query.mockResolvedValue(mockResult as any);

      const count = await sessionRepository.revokeAllUserSessions(userId);

      expect(count).toBe(3);
      expect(mockPool.query).toHaveBeenCalledTimes(1);
    });

    it('should return 0 when no sessions to revoke', async () => {
      const userId = 'user-uuid-123';
      const mockResult = {
        rowCount: 0,
      };

      mockPool.query.mockResolvedValue(mockResult as any);

      const count = await sessionRepository.revokeAllUserSessions(userId);

      expect(count).toBe(0);
    });
  });

  describe('deleteExpiredSessions', () => {
    it('should delete expired sessions', async () => {
      const mockResult = {
        rowCount: 5,
      };

      mockPool.query.mockResolvedValue(mockResult as any);

      const count = await sessionRepository.deleteExpiredSessions();

      expect(count).toBe(5);
      expect(mockPool.query).toHaveBeenCalledWith(
        'DELETE FROM sessions WHERE expires_at < NOW()'
      );
    });

    it('should return 0 when no expired sessions', async () => {
      const mockResult = {
        rowCount: 0,
      };

      mockPool.query.mockResolvedValue(mockResult as any);

      const count = await sessionRepository.deleteExpiredSessions();

      expect(count).toBe(0);
    });
  });
});