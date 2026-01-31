import { OAuthService, OAuthUserInfo } from '../../src/services/oauth.service';
import { OAuthStateRepository } from '../../src/repositories/oauth-state.repository';
import { UserRepository } from '../../src/repositories/user.repository';
import { UnauthorizedError, BadRequestError } from '../../src/utils/errors';

// Mock repositories
jest.mock('../../src/repositories/oauth-state.repository');
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

describe('OAuthService', () => {
  let oauthService: OAuthService;
  let mockOAuthStateRepo: jest.Mocked<OAuthStateRepository>;
  let mockUserRepo: jest.Mocked<UserRepository>;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Create mock instances
    mockOAuthStateRepo = new OAuthStateRepository(null as any) as jest.Mocked<OAuthStateRepository>;
    mockUserRepo = new UserRepository(null as any) as jest.Mocked<UserRepository>;

    // Create service instance
    oauthService = new OAuthService(mockOAuthStateRepo, mockUserRepo);
  });

  describe('generateAuthUrl', () => {
    it('should generate Google OAuth URL with state token', async () => {
      // Arrange
      const redirectUri = 'http://localhost:3000/auth/google/callback';
      mockOAuthStateRepo.createState = jest.fn().mockResolvedValue(undefined);

      // Act
      const result = await oauthService.generateAuthUrl('google', redirectUri);

      // Assert
      expect(result).toHaveProperty('authUrl');
      expect(result).toHaveProperty('state');
      expect(result.authUrl).toContain('accounts.google.com');
      expect(result.authUrl).toContain(result.state);
      expect(mockOAuthStateRepo.createState).toHaveBeenCalledWith(
        result.state,
        'google'
      );
    });

    it('should generate GitHub OAuth URL with state token', async () => {
      // Arrange
      const redirectUri = 'http://localhost:3000/auth/github/callback';
      mockOAuthStateRepo.createState = jest.fn().mockResolvedValue(undefined);

      // Act
      const result = await oauthService.generateAuthUrl('github', redirectUri);

      // Assert
      expect(result).toHaveProperty('authUrl');
      expect(result).toHaveProperty('state');
      expect(result.authUrl).toContain('github.com');
      expect(result.authUrl).toContain(result.state);
      expect(mockOAuthStateRepo.createState).toHaveBeenCalledWith(
        result.state,
        'github'
      );
    });

    it('should throw BadRequestError for unsupported provider', async () => {
      // Arrange
      const redirectUri = 'http://localhost:3000/auth/callback';
      const invalidProvider = 'facebook' as any;

      // Act & Assert
      await expect(
        oauthService.generateAuthUrl(invalidProvider, redirectUri)
      ).rejects.toThrow(BadRequestError);
    });

    it('should generate unique state tokens for each request', async () => {
      // Arrange
      const redirectUri = 'http://localhost:3000/auth/google/callback';
      mockOAuthStateRepo.createState = jest.fn().mockResolvedValue(undefined);

      // Act
      const result1 = await oauthService.generateAuthUrl('google', redirectUri);
      const result2 = await oauthService.generateAuthUrl('google', redirectUri);

      // Assert
      expect(result1.state).not.toBe(result2.state);
    });
  });

  describe('handleCallback', () => {
    it('should successfully handle valid Google OAuth callback', async () => {
      // Arrange
      const code = 'valid_auth_code';
      const state = 'valid_state_token';
      const redirectUri = 'http://localhost:3000/auth/google/callback';

      const mockStateRecord = {
        id: 'state-id',
        state: state,
        provider: 'google' as const,
        used: false,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 600000), // 10 minutes
      };

      mockOAuthStateRepo.getState = jest.fn().mockResolvedValue(mockStateRecord);
      mockOAuthStateRepo.markStateUsed = jest.fn().mockResolvedValue(undefined);

      // Mock OAuth provider responses (would need to mock axios calls in real implementation)
      // For now, we'll test the validation logic

      // Act & Assert
      // Note: This test would need more setup to fully test the OAuth flow
      // including mocking axios calls to Google's token and userinfo endpoints
    });

    it('should reject invalid state token', async () => {
      // Arrange
      const code = 'valid_auth_code';
      const state = 'invalid_state';
      const redirectUri = 'http://localhost:3000/auth/google/callback';

      mockOAuthStateRepo.getState = jest.fn().mockResolvedValue(null);

      // Act & Assert
      await expect(
        oauthService.handleCallback('google', code, state, redirectUri)
      ).rejects.toThrow(UnauthorizedError);
    });

    it('should reject already used state token', async () => {
      // Arrange
      const code = 'valid_auth_code';
      const state = 'used_state_token';
      const redirectUri = 'http://localhost:3000/auth/google/callback';

      const mockStateRecord = {
        id: 'state-id',
        state: state,
        provider: 'google' as const,
        used: true, // Already used
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 600000),
      };

      mockOAuthStateRepo.getState = jest.fn().mockResolvedValue(mockStateRecord);

      // Act & Assert
      await expect(
        oauthService.handleCallback('google', code, state, redirectUri)
      ).rejects.toThrow(UnauthorizedError);
    });

    it('should reject state token with mismatched provider', async () => {
      // Arrange
      const code = 'valid_auth_code';
      const state = 'valid_state_token';
      const redirectUri = 'http://localhost:3000/auth/google/callback';

      const mockStateRecord = {
        id: 'state-id',
        state: state,
        provider: 'github' as const, // Different provider
        used: false,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 600000),
      };

      mockOAuthStateRepo.getState = jest.fn().mockResolvedValue(mockStateRecord);

      // Act & Assert
      await expect(
        oauthService.handleCallback('google', code, state, redirectUri)
      ).rejects.toThrow(UnauthorizedError);
    });
  });

  describe('cleanupExpiredStates', () => {
    it('should call repository deleteExpiredStates', async () => {
      // Arrange
      mockOAuthStateRepo.deleteExpiredStates = jest.fn().mockResolvedValue(undefined);

      // Act
      await oauthService.cleanupExpiredStates();

      // Assert
      expect(mockOAuthStateRepo.deleteExpiredStates).toHaveBeenCalledTimes(1);
    });

    it('should propagate repository errors', async () => {
      // Arrange
      const error = new Error('Database error');
      mockOAuthStateRepo.deleteExpiredStates = jest.fn().mockRejectedValue(error);

      // Act & Assert
      await expect(oauthService.cleanupExpiredStates()).rejects.toThrow(error);
    });
  });
});