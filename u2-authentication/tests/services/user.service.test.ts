import { UserService } from '../../src/services/user.service';
import { UserRepository } from '../../src/repositories/user.repository';
import { OAuthUserInfo } from '../../src/services/oauth.service';
import { ConflictError, NotFoundError, BadRequestError } from '../../src/utils/errors';

// Mock dependencies
jest.mock('../../src/repositories/user.repository');

// Mock logger
jest.mock('../../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('UserService', () => {
  let userService: UserService;
  let mockUserRepo: jest.Mocked<UserRepository>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockUserRepo = new UserRepository(null as any) as jest.Mocked<UserRepository>;
    userService = new UserService(mockUserRepo);
  });

  describe('createOrUpdateUser', () => {
    it('should create new user from OAuth info', async () => {
      // Arrange
      const oauthInfo: OAuthUserInfo = {
        providerId: 'google-123',
        email: 'newuser@example.com',
        displayName: 'New User',
        avatarUrl: 'https://example.com/avatar.jpg',
        provider: 'google',
      };

      const createdUser = {
        id: 'user-new',
        email: oauthInfo.email,
        displayName: oauthInfo.displayName,
        avatarUrl: oauthInfo.avatarUrl,
        oauthProvider: oauthInfo.provider,
        oauthProviderId: oauthInfo.providerId,
        createdAt: new Date(),
        lastLoginAt: new Date(),
      };

      mockUserRepo.getUserByOAuth = jest.fn().mockResolvedValue(null);
      mockUserRepo.getUserByEmail = jest.fn().mockResolvedValue(null);
      mockUserRepo.createUser = jest.fn().mockResolvedValue(createdUser);

      // Act
      const result = await userService.createOrUpdateUser(oauthInfo);

      // Assert
      expect(result.id).toBe('user-new');
      expect(result.email).toBe(oauthInfo.email);
      expect(mockUserRepo.createUser).toHaveBeenCalled();
    });

    it('should update existing user on subsequent login', async () => {
      // Arrange
      const oauthInfo: OAuthUserInfo = {
        providerId: 'google-123',
        email: 'updated@example.com',
        displayName: 'Updated User',
        avatarUrl: 'https://example.com/new-avatar.jpg',
        provider: 'google',
      };

      const existingUser = {
        id: 'user-existing',
        email: 'old@example.com',
        displayName: 'Old User',
        avatarUrl: 'https://example.com/old-avatar.jpg',
        oauthProvider: 'google' as const,
        oauthProviderId: 'google-123',
        createdAt: new Date(),
        lastLoginAt: new Date(),
      };

      const updatedUser = {
        ...existingUser,
        email: oauthInfo.email,
        displayName: oauthInfo.displayName,
        avatarUrl: oauthInfo.avatarUrl,
      };

      mockUserRepo.getUserByOAuth = jest.fn().mockResolvedValue(existingUser);
      mockUserRepo.getUserByEmail = jest.fn().mockResolvedValue(null);
      mockUserRepo.updateUser = jest.fn().mockResolvedValue(updatedUser);
      mockUserRepo.updateLastLogin = jest.fn().mockResolvedValue(undefined);

      // Act
      const result = await userService.createOrUpdateUser(oauthInfo);

      // Assert
      expect(result.email).toBe(oauthInfo.email);
      expect(mockUserRepo.updateUser).toHaveBeenCalled();
      expect(mockUserRepo.updateLastLogin).toHaveBeenCalled();
    });

    it('should throw ConflictError if email is taken by different user', async () => {
      // Arrange
      const oauthInfo: OAuthUserInfo = {
        providerId: 'google-123',
        email: 'taken@example.com',
        displayName: 'User',
        provider: 'google',
      };

      const differentUser = {
        id: 'user-different',
        email: oauthInfo.email,
        displayName: 'Different User',
        avatarUrl: null,
        oauthProvider: 'github' as const,
        oauthProviderId: 'github-456',
        createdAt: new Date(),
        lastLoginAt: new Date(),
      };

      mockUserRepo.getUserByOAuth = jest.fn().mockResolvedValue(null);
      mockUserRepo.getUserByEmail = jest.fn().mockResolvedValue(differentUser);

      // Act & Assert
      await expect(
        userService.createOrUpdateUser(oauthInfo)
      ).rejects.toThrow(ConflictError);
    });
  });

  describe('getUserProfile', () => {
    it('should return user profile for valid user ID', async () => {
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

      mockUserRepo.getUserById = jest.fn().mockResolvedValue(mockUser);

      // Act
      const result = await userService.getUserProfile(userId);

      // Assert
      expect(result.id).toBe(userId);
      expect(result.email).toBe('test@example.com');
    });

    it('should throw NotFoundError for non-existent user', async () => {
      // Arrange
      const userId = 'non-existent';
      mockUserRepo.getUserById = jest.fn().mockResolvedValue(null);

      // Act & Assert
      await expect(
        userService.getUserProfile(userId)
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('updateUserProfile', () => {
    it('should update user display name', async () => {
      // Arrange
      const userId = 'user-123';
      const existingUser = {
        id: userId,
        email: 'test@example.com',
        displayName: 'Old Name',
        avatarUrl: null,
        oauthProvider: 'google' as const,
        oauthProviderId: 'google-123',
        createdAt: new Date(),
        lastLoginAt: new Date(),
      };

      const updatedUser = {
        ...existingUser,
        displayName: 'New Name',
      };

      mockUserRepo.getUserById = jest.fn().mockResolvedValue(existingUser);
      mockUserRepo.updateUser = jest.fn().mockResolvedValue(updatedUser);

      // Act
      const result = await userService.updateUserProfile(userId, {
        displayName: 'New Name',
      });

      // Assert
      expect(result.displayName).toBe('New Name');
      expect(mockUserRepo.updateUser).toHaveBeenCalled();
    });

    it('should update user avatar URL', async () => {
      // Arrange
      const userId = 'user-123';
      const existingUser = {
        id: userId,
        email: 'test@example.com',
        displayName: 'Test User',
        avatarUrl: null,
        oauthProvider: 'google' as const,
        oauthProviderId: 'google-123',
        createdAt: new Date(),
        lastLoginAt: new Date(),
      };

      const updatedUser = {
        ...existingUser,
        avatarUrl: 'https://example.com/new-avatar.jpg',
      };

      mockUserRepo.getUserById = jest.fn().mockResolvedValue(existingUser);
      mockUserRepo.updateUser = jest.fn().mockResolvedValue(updatedUser);

      // Act
      const result = await userService.updateUserProfile(userId, {
        avatarUrl: 'https://example.com/new-avatar.jpg',
      });

      // Assert
      expect(result.avatarUrl).toBe('https://example.com/new-avatar.jpg');
    });

    it('should throw BadRequestError for empty display name', async () => {
      // Arrange
      const userId = 'user-123';
      const existingUser = {
        id: userId,
        email: 'test@example.com',
        displayName: 'Test User',
        avatarUrl: null,
        oauthProvider: 'google' as const,
        oauthProviderId: 'google-123',
        createdAt: new Date(),
        lastLoginAt: new Date(),
      };

      mockUserRepo.getUserById = jest.fn().mockResolvedValue(existingUser);

      // Act & Assert
      await expect(
        userService.updateUserProfile(userId, { displayName: '   ' })
      ).rejects.toThrow(BadRequestError);
    });

    it('should throw BadRequestError for too long display name', async () => {
      // Arrange
      const userId = 'user-123';
      const existingUser = {
        id: userId,
        email: 'test@example.com',
        displayName: 'Test User',
        avatarUrl: null,
        oauthProvider: 'google' as const,
        oauthProviderId: 'google-123',
        createdAt: new Date(),
        lastLoginAt: new Date(),
      };

      mockUserRepo.getUserById = jest.fn().mockResolvedValue(existingUser);

      // Act & Assert
      await expect(
        userService.updateUserProfile(userId, {
          displayName: 'a'.repeat(101), // 101 characters
        })
      ).rejects.toThrow(BadRequestError);
    });

    it('should throw BadRequestError for too long avatar URL', async () => {
      // Arrange
      const userId = 'user-123';
      const existingUser = {
        id: userId,
        email: 'test@example.com',
        displayName: 'Test User',
        avatarUrl: null,
        oauthProvider: 'google' as const,
        oauthProviderId: 'google-123',
        createdAt: new Date(),
        lastLoginAt: new Date(),
      };

      mockUserRepo.getUserById = jest.fn().mockResolvedValue(existingUser);

      // Act & Assert
      await expect(
        userService.updateUserProfile(userId, {
          avatarUrl: 'https://example.com/' + 'a'.repeat(500), // >500 characters
        })
      ).rejects.toThrow(BadRequestError);
    });

    it('should throw NotFoundError if user does not exist', async () => {
      // Arrange
      const userId = 'non-existent';
      mockUserRepo.getUserById = jest.fn().mockResolvedValue(null);

      // Act & Assert
      await expect(
        userService.updateUserProfile(userId, { displayName: 'New Name' })
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('validateEmailUniqueness', () => {
    it('should return true for unique email', async () => {
      // Arrange
      const email = 'unique@example.com';
      mockUserRepo.getUserByEmail = jest.fn().mockResolvedValue(null);

      // Act
      const result = await userService.validateEmailUniqueness(email);

      // Assert
      expect(result).toBe(true);
    });

    it('should return false for existing email', async () => {
      // Arrange
      const email = 'existing@example.com';
      const existingUser = {
        id: 'user-123',
        email: email,
        displayName: 'Existing User',
        avatarUrl: null,
        oauthProvider: 'google' as const,
        oauthProviderId: 'google-123',
        createdAt: new Date(),
        lastLoginAt: new Date(),
      };

      mockUserRepo.getUserByEmail = jest.fn().mockResolvedValue(existingUser);

      // Act
      const result = await userService.validateEmailUniqueness(email);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('getUserByEmail', () => {
    it('should return user for existing email', async () => {
      // Arrange
      const email = 'test@example.com';
      const mockUser = {
        id: 'user-123',
        email: email,
        displayName: 'Test User',
        avatarUrl: null,
        oauthProvider: 'google' as const,
        oauthProviderId: 'google-123',
        createdAt: new Date(),
        lastLoginAt: new Date(),
      };

      mockUserRepo.getUserByEmail = jest.fn().mockResolvedValue(mockUser);

      // Act
      const result = await userService.getUserByEmail(email);

      // Assert
      expect(result).not.toBeNull();
      expect(result?.email).toBe(email);
    });

    it('should return null for non-existent email', async () => {
      // Arrange
      const email = 'nonexistent@example.com';
      mockUserRepo.getUserByEmail = jest.fn().mockResolvedValue(null);

      // Act
      const result = await userService.getUserByEmail(email);

      // Assert
      expect(result).toBeNull();
    });
  });
});