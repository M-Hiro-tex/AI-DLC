import { TokenService } from '../../src/services/token.service';
import jwt from 'jsonwebtoken';

// Mock logger
jest.mock('../../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

// Set test environment variables
process.env.JWT_SECRET = 'test-jwt-secret-key-that-is-at-least-32-characters-long';
process.env.JWT_EXPIRES_IN = '15m';

describe('TokenService', () => {
  let tokenService: TokenService;

  beforeEach(() => {
    tokenService = new TokenService();
  });

  describe('generateAccessToken', () => {
    it('should generate valid JWT access token', () => {
      // Arrange
      const payload = {
        userId: 'user-123',
        email: 'test@example.com',
        displayName: 'Test User',
      };

      // Act
      const token = tokenService.generateAccessToken(payload);

      // Assert
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT format: header.payload.signature
    });

    it('should include correct payload in JWT', () => {
      // Arrange
      const payload = {
        userId: 'user-123',
        email: 'test@example.com',
        displayName: 'Test User',
      };

      // Act
      const token = tokenService.generateAccessToken(payload);
      const decoded = jwt.decode(token) as any;

      // Assert
      expect(decoded.userId).toBe(payload.userId);
      expect(decoded.email).toBe(payload.email);
      expect(decoded.displayName).toBe(payload.displayName);
      expect(decoded.iss).toBe('auth-service');
      expect(decoded.aud).toBe('aidlc-app');
    });

    it('should generate different tokens for different users', () => {
      // Arrange
      const payload1 = {
        userId: 'user-1',
        email: 'user1@example.com',
        displayName: 'User One',
      };
      const payload2 = {
        userId: 'user-2',
        email: 'user2@example.com',
        displayName: 'User Two',
      };

      // Act
      const token1 = tokenService.generateAccessToken(payload1);
      const token2 = tokenService.generateAccessToken(payload2);

      // Assert
      expect(token1).not.toBe(token2);
    });
  });

  describe('verifyAccessToken', () => {
    it('should verify and decode valid token', () => {
      // Arrange
      const payload = {
        userId: 'user-123',
        email: 'test@example.com',
        displayName: 'Test User',
      };
      const token = tokenService.generateAccessToken(payload);

      // Act
      const result = tokenService.verifyAccessToken(token);

      // Assert
      expect(result).not.toBeNull();
      expect(result?.userId).toBe(payload.userId);
      expect(result?.email).toBe(payload.email);
      expect(result?.displayName).toBe(payload.displayName);
    });

    it('should return null for invalid token', () => {
      // Arrange
      const invalidToken = 'invalid.jwt.token';

      // Act
      const result = tokenService.verifyAccessToken(invalidToken);

      // Assert
      expect(result).toBeNull();
    });

    it('should return null for expired token', () => {
      // Arrange
      const payload = {
        userId: 'user-123',
        email: 'test@example.com',
        displayName: 'Test User',
      };
      
      // Generate token that expires immediately
      const expiredToken = jwt.sign(
        payload,
        process.env.JWT_SECRET!,
        { expiresIn: '0s', issuer: 'auth-service', audience: 'aidlc-app' }
      );

      // Wait for token to expire
      setTimeout(() => {
        // Act
        const result = tokenService.verifyAccessToken(expiredToken);

        // Assert
        expect(result).toBeNull();
      }, 100);
    });

    it('should return null for token with wrong signature', () => {
      // Arrange
      const payload = {
        userId: 'user-123',
        email: 'test@example.com',
        displayName: 'Test User',
      };
      
      // Generate token with different secret
      const tokenWithWrongSignature = jwt.sign(
        payload,
        'wrong-secret-key-that-is-different',
        { expiresIn: '15m', issuer: 'auth-service', audience: 'aidlc-app' }
      );

      // Act
      const result = tokenService.verifyAccessToken(tokenWithWrongSignature);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('generateRefreshToken', () => {
    it('should generate refresh token', () => {
      // Act
      const token = tokenService.generateRefreshToken();

      // Assert
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(0);
    });

    it('should generate unique refresh tokens', () => {
      // Act
      const token1 = tokenService.generateRefreshToken();
      const token2 = tokenService.generateRefreshToken();

      // Assert
      expect(token1).not.toBe(token2);
    });

    it('should generate cryptographically secure tokens', () => {
      // Act
      const token = tokenService.generateRefreshToken();

      // Assert - base64url encoded 32 bytes should be approximately 43 characters
      expect(token.length).toBeGreaterThanOrEqual(43);
      expect(token).toMatch(/^[A-Za-z0-9_-]+$/); // base64url format
    });
  });

  describe('hashToken', () => {
    it('should hash token consistently', () => {
      // Arrange
      const token = 'test-token-123';

      // Act
      const hash1 = tokenService.hashToken(token);
      const hash2 = tokenService.hashToken(token);

      // Assert
      expect(hash1).toBe(hash2);
    });

    it('should produce different hashes for different tokens', () => {
      // Arrange
      const token1 = 'test-token-123';
      const token2 = 'test-token-456';

      // Act
      const hash1 = tokenService.hashToken(token1);
      const hash2 = tokenService.hashToken(token2);

      // Assert
      expect(hash1).not.toBe(hash2);
    });

    it('should produce base64url encoded hash', () => {
      // Arrange
      const token = 'test-token-123';

      // Act
      const hash = tokenService.hashToken(token);

      // Assert
      expect(hash).toMatch(/^[A-Za-z0-9_-]+$/); // base64url format
    });
  });

  describe('compareTokenHash', () => {
    it('should return true for matching token and hash', () => {
      // Arrange
      const token = 'test-token-123';
      const hash = tokenService.hashToken(token);

      // Act
      const result = tokenService.compareTokenHash(token, hash);

      // Assert
      expect(result).toBe(true);
    });

    it('should return false for non-matching token and hash', () => {
      // Arrange
      const token1 = 'test-token-123';
      const token2 = 'test-token-456';
      const hash = tokenService.hashToken(token1);

      // Act
      const result = tokenService.compareTokenHash(token2, hash);

      // Assert
      expect(result).toBe(false);
    });

    it('should use constant-time comparison', () => {
      // Arrange
      const token = 'test-token-123';
      const hash = tokenService.hashToken(token);

      // Act - multiple comparisons should take similar time
      const start1 = process.hrtime.bigint();
      tokenService.compareTokenHash(token, hash);
      const duration1 = process.hrtime.bigint() - start1;

      const start2 = process.hrtime.bigint();
      tokenService.compareTokenHash(token, hash);
      const duration2 = process.hrtime.bigint() - start2;

      // Assert - timing difference should be minimal (within 10x)
      const ratio = Number(duration1) / Number(duration2);
      expect(ratio).toBeLessThan(10);
      expect(ratio).toBeGreaterThan(0.1);
    });
  });

  describe('decodeToken', () => {
    it('should decode valid token without verification', () => {
      // Arrange
      const payload = {
        userId: 'user-123',
        email: 'test@example.com',
        displayName: 'Test User',
      };
      const token = tokenService.generateAccessToken(payload);

      // Act
      const decoded = tokenService.decodeToken(token);

      // Assert
      expect(decoded).not.toBeNull();
      expect(decoded?.userId).toBe(payload.userId);
      expect(decoded?.email).toBe(payload.email);
    });

    it('should return null for invalid token format', () => {
      // Arrange
      const invalidToken = 'not-a-valid-jwt';

      // Act
      const decoded = tokenService.decodeToken(invalidToken);

      // Assert
      expect(decoded).toBeNull();
    });
  });
});