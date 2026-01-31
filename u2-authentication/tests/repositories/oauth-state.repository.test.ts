/**
 * OAuth State Repository Unit Tests
 */

import { Pool } from 'pg';
import { OAuthStateRepository } from '../../src/repositories/oauth-state.repository';
import { OAuthStateCreateInput, OAuthProvider } from '../../src/db/schema';

// Mock logger
jest.mock('../../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('OAuthStateRepository', () => {
  let mockPool: jest.Mocked<Pool>;
  let oauthStateRepository: OAuthStateRepository;

  beforeEach(() => {
    mockPool = {
      query: jest.fn(),
    } as any;

    oauthStateRepository = new OAuthStateRepository(mockPool);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createState', () => {
    it('should create a new OAuth state successfully', async () => {
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
      const input: OAuthStateCreateInput = {
        stateToken: 'random-state-token-123',
        provider: 'google',
        redirectUrl: 'https://example.com/callback',
        expiresAt,
      };

      const mockResult = {
        rows: [
          {
            id: 'state-uuid-123',
            state_token: 'random-state-token-123',
            provider: 'google',
            redirect_url: 'https://example.com/callback',
            used_at: null,
            expires_at: expiresAt,
            created_at: new Date(),
          },
        ],
      };

      mockPool.query.mockResolvedValue(mockResult as any);

      const result = await oauthStateRepository.createState(input);

      expect(result.stateToken).toBe('random-state-token-123');
      expect(result.provider).toBe('google');
      expect(result.redirectUrl).toBe('https://example.com/callback');
      expect(mockPool.query).toHaveBeenCalledTimes(1);
    });
  });

  describe('getState', () => {
    it('should return valid OAuth state when found', async () => {
      const stateToken = 'random-state-token-123';
      const futureDate = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes from now

      const mockResult = {
        rows: [
          {
            id: 'state-uuid-123',
            state_token: stateToken,
            provider: 'google',
            redirect_url: 'https://example.com/callback',
            used_at: null,
            expires_at: futureDate,
            created_at: new Date(),
          },
        ],
      };

      mockPool.query.mockResolvedValue(mockResult as any);

      const result = await oauthStateRepository.getState(stateToken);

      expect(result).not.toBeNull();
      expect(result?.stateToken).toBe(stateToken);
      expect(result?.usedAt).toBeNull();
    });

    it('should return null when state not found', async () => {
      const stateToken = 'non-existent-token';
      const mockResult = { rows: [] };

      mockPool.query.mockResolvedValue(mockResult as any);

      const result = await oauthStateRepository.getState(stateToken);

      expect(result).toBeNull();
    });

    it('should return null when state is already used', async () => {
      const stateToken = 'used-token';
      const mockResult = { rows: [] }; // Query filters out used states

      mockPool.query.mockResolvedValue(mockResult as any);

      const result = await oauthStateRepository.getState(stateToken);

      expect(result).toBeNull();
    });

    it('should return null when state is expired', async () => {
      const stateToken = 'expired-token';
      const mockResult = { rows: [] }; // Query filters out expired states

      mockPool.query.mockResolvedValue(mockResult as any);

      const result = await oauthStateRepository.getState(stateToken);

      expect(result).toBeNull();
    });
  });

  describe('markStateUsed', () => {
    it('should mark OAuth state as used', async () => {
      const stateToken = 'random-state-token-123';
      const now = new Date();

      const mockResult = {
        rows: [
          {
            id: 'state-uuid-123',
            state_token: stateToken,
            provider: 'google',
            redirect_url: 'https://example.com/callback',
            used_at: now,
            expires_at: new Date(Date.now() + 5 * 60 * 1000),
            created_at: new Date(),
          },
        ],
      };

      mockPool.query.mockResolvedValue(mockResult as any);

      const result = await oauthStateRepository.markStateUsed(stateToken);

      expect(result.usedAt).toEqual(now);
      expect(mockPool.query).toHaveBeenCalledTimes(1);
    });

    it('should throw error when state not found', async () => {
      const stateToken = 'non-existent-token';
      const mockResult = { rows: [] };

      mockPool.query.mockResolvedValue(mockResult as any);

      await expect(oauthStateRepository.markStateUsed(stateToken)).rejects.toThrow(
        `OAuth state not found: ${stateToken}`
      );
    });
  });

  describe('deleteExpiredStates', () => {
    it('should delete expired OAuth states', async () => {
      const mockResult = {
        rowCount: 10,
      };

      mockPool.query.mockResolvedValue(mockResult as any);

      const count = await oauthStateRepository.deleteExpiredStates();

      expect(count).toBe(10);
      expect(mockPool.query).toHaveBeenCalledWith(
        'DELETE FROM oauth_states WHERE expires_at < NOW()'
      );
    });

    it('should return 0 when no expired states', async () => {
      const mockResult = {
        rowCount: 0,
      };

      mockPool.query.mockResolvedValue(mockResult as any);

      const count = await oauthStateRepository.deleteExpiredStates();

      expect(count).toBe(0);
    });
  });

  describe('deleteUsedStates', () => {
    it('should delete used OAuth states older than specified minutes', async () => {
      const olderThanMinutes = 60;
      const mockResult = {
        rowCount: 5,
      };

      mockPool.query.mockResolvedValue(mockResult as any);

      const count = await oauthStateRepository.deleteUsedStates(olderThanMinutes);

      expect(count).toBe(5);
      expect(mockPool.query).toHaveBeenCalledTimes(1);
    });

    it('should use default 60 minutes when not specified', async () => {
      const mockResult = {
        rowCount: 3,
      };

      mockPool.query.mockResolvedValue(mockResult as any);

      const count = await oauthStateRepository.deleteUsedStates();

      expect(count).toBe(3);
    });

    it('should return 0 when no used states to delete', async () => {
      const mockResult = {
        rowCount: 0,
      };

      mockPool.query.mockResolvedValue(mockResult as any);

      const count = await oauthStateRepository.deleteUsedStates(30);

      expect(count).toBe(0);
    });
  });
});