/**
 * User Repository Unit Tests
 */

import { Pool } from 'pg';
import { UserRepository } from '../../src/repositories/user.repository';
import { UserCreateInput, OAuthProvider } from '../../src/db/schema';

// Mock logger to avoid console output during tests
jest.mock('../../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('UserRepository', () => {
  let mockPool: jest.Mocked<Pool>;
  let userRepository: UserRepository;

  beforeEach(() => {
    // Create mock pool
    mockPool = {
      query: jest.fn(),
    } as any;

    userRepository = new UserRepository(mockPool);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createUser', () => {
    it('should create a new user successfully', async () => {
      const input: UserCreateInput = {
        email: 'test@example.com',
        displayName: 'Test User',
        avatarUrl: 'https://example.com/avatar.jpg',
        oauthProvider: 'google',
        oauthProviderId: 'google-123',
      };

      const mockResult = {
        rows: [
          {
            id: 'user-uuid-123',
            email: 'test@example.com',
            display_name: 'Test User',
            avatar_url: 'https://example.com/avatar.jpg',
            oauth_provider: 'google',
            oauth_provider_id: 'google-123',
            last_login_at: null,
            created_at: new Date(),
            updated_at: new Date(),
          },
        ],
      };

      mockPool.query.mockResolvedValue(mockResult as any);

      const result = await userRepository.createUser(input);

      expect(result.email).toBe('test@example.com');
      expect(result.displayName).toBe('Test User');
      expect(result.oauthProvider).toBe('google');
      expect(mockPool.query).toHaveBeenCalledTimes(1);
    });

    it('should throw error when creating user with duplicate email', async () => {
      const input: UserCreateInput = {
        email: 'duplicate@example.com',
        displayName: 'Duplicate User',
        oauthProvider: 'google',
        oauthProviderId: 'google-456',
      };

      const mockError = new Error('duplicate key value violates unique constraint');
      mockPool.query.mockRejectedValue(mockError);

      await expect(userRepository.createUser(input)).rejects.toThrow();
      expect(mockPool.query).toHaveBeenCalledTimes(1);
    });
  });

  describe('getUserById', () => {
    it('should return user when found', async () => {
      const userId = 'user-uuid-123';
      const mockResult = {
        rows: [
          {
            id: userId,
            email: 'test@example.com',
            display_name: 'Test User',
            avatar_url: null,
            oauth_provider: 'google',
            oauth_provider_id: 'google-123',
            last_login_at: null,
            created_at: new Date(),
            updated_at: new Date(),
          },
        ],
      };

      mockPool.query.mockResolvedValue(mockResult as any);

      const result = await userRepository.getUserById(userId);

      expect(result).not.toBeNull();
      expect(result?.id).toBe(userId);
      expect(result?.email).toBe('test@example.com');
      expect(mockPool.query).toHaveBeenCalledWith('SELECT * FROM users WHERE id = $1', [
        userId,
      ]);
    });

    it('should return null when user not found', async () => {
      const userId = 'non-existent-user';
      const mockResult = { rows: [] };

      mockPool.query.mockResolvedValue(mockResult as any);

      const result = await userRepository.getUserById(userId);

      expect(result).toBeNull();
      expect(mockPool.query).toHaveBeenCalledTimes(1);
    });
  });

  describe('getUserByOAuth', () => {
    it('should return user when found by OAuth credentials', async () => {
      const provider: OAuthProvider = 'google';
      const providerId = 'google-123';

      const mockResult = {
        rows: [
          {
            id: 'user-uuid-123',
            email: 'oauth@example.com',
            display_name: 'OAuth User',
            avatar_url: null,
            oauth_provider: provider,
            oauth_provider_id: providerId,
            last_login_at: null,
            created_at: new Date(),
            updated_at: new Date(),
          },
        ],
      };

      mockPool.query.mockResolvedValue(mockResult as any);

      const result = await userRepository.getUserByOAuth(provider, providerId);

      expect(result).not.toBeNull();
      expect(result?.oauthProvider).toBe(provider);
      expect(result?.oauthProviderId).toBe(providerId);
    });

    it('should return null when OAuth user not found', async () => {
      const provider: OAuthProvider = 'github';
      const providerId = 'github-999';
      const mockResult = { rows: [] };

      mockPool.query.mockResolvedValue(mockResult as any);

      const result = await userRepository.getUserByOAuth(provider, providerId);

      expect(result).toBeNull();
    });
  });

  describe('getUserByEmail', () => {
    it('should return user when found by email', async () => {
      const email = 'test@example.com';
      const mockResult = {
        rows: [
          {
            id: 'user-uuid-123',
            email,
            display_name: 'Test User',
            avatar_url: null,
            oauth_provider: 'google',
            oauth_provider_id: 'google-123',
            last_login_at: null,
            created_at: new Date(),
            updated_at: new Date(),
          },
        ],
      };

      mockPool.query.mockResolvedValue(mockResult as any);

      const result = await userRepository.getUserByEmail(email);

      expect(result).not.toBeNull();
      expect(result?.email).toBe(email);
    });

    it('should return null when email not found', async () => {
      const email = 'notfound@example.com';
      const mockResult = { rows: [] };

      mockPool.query.mockResolvedValue(mockResult as any);

      const result = await userRepository.getUserByEmail(email);

      expect(result).toBeNull();
    });
  });

  describe('updateUser', () => {
    it('should update user profile successfully', async () => {
      const userId = 'user-uuid-123';
      const updateInput = {
        displayName: 'Updated Name',
        avatarUrl: 'https://example.com/new-avatar.jpg',
      };

      const mockResult = {
        rows: [
          {
            id: userId,
            email: 'test@example.com',
            display_name: 'Updated Name',
            avatar_url: 'https://example.com/new-avatar.jpg',
            oauth_provider: 'google',
            oauth_provider_id: 'google-123',
            last_login_at: null,
            created_at: new Date(),
            updated_at: new Date(),
          },
        ],
      };

      mockPool.query.mockResolvedValue(mockResult as any);

      const result = await userRepository.updateUser(userId, updateInput);

      expect(result.displayName).toBe('Updated Name');
      expect(result.avatarUrl).toBe('https://example.com/new-avatar.jpg');
      expect(mockPool.query).toHaveBeenCalledTimes(1);
    });

    it('should throw error when updating non-existent user', async () => {
      const userId = 'non-existent-user';
      const updateInput = { displayName: 'New Name' };
      const mockResult = { rows: [] };

      mockPool.query.mockResolvedValue(mockResult as any);

      await expect(userRepository.updateUser(userId, updateInput)).rejects.toThrow(
        `User not found: ${userId}`
      );
    });

    it('should throw error when no fields to update', async () => {
      const userId = 'user-uuid-123';
      const updateInput = {};

      await expect(userRepository.updateUser(userId, updateInput)).rejects.toThrow(
        'No fields to update'
      );
    });
  });

  describe('updateLastLogin', () => {
    it('should update last login timestamp', async () => {
      const userId = 'user-uuid-123';
      const now = new Date();

      const mockResult = {
        rows: [
          {
            id: userId,
            email: 'test@example.com',
            display_name: 'Test User',
            avatar_url: null,
            oauth_provider: 'google',
            oauth_provider_id: 'google-123',
            last_login_at: now,
            created_at: new Date(),
            updated_at: new Date(),
          },
        ],
      };

      mockPool.query.mockResolvedValue(mockResult as any);

      const result = await userRepository.updateLastLogin(userId);

      expect(result.lastLoginAt).toEqual(now);
      expect(mockPool.query).toHaveBeenCalledTimes(1);
    });

    it('should throw error when user not found', async () => {
      const userId = 'non-existent-user';
      const mockResult = { rows: [] };

      mockPool.query.mockResolvedValue(mockResult as any);

      await expect(userRepository.updateLastLogin(userId)).rejects.toThrow(
        `User not found: ${userId}`
      );
    });
  });
});