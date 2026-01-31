import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { logger } from '../utils/logger';

export interface TokenPayload {
  userId: string;
  email: string;
  displayName: string;
}

export interface JWTPayload extends TokenPayload {
  iat: number;
  exp: number;
}

export class TokenService {
  private jwtSecret: string;
  private jwtExpiresIn: string;

  constructor() {
    this.jwtSecret = process.env.JWT_SECRET || '';
    this.jwtExpiresIn = process.env.JWT_EXPIRES_IN || '15m'; // 15 minutes default

    if (!this.jwtSecret) {
      throw new Error('JWT_SECRET environment variable is required');
    }

    if (this.jwtSecret.length < 32) {
      throw new Error('JWT_SECRET must be at least 32 characters long');
    }
  }

  /**
   * Generate JWT access token
   */
  generateAccessToken(payload: TokenPayload): string {
    try {
      const token = jwt.sign(
        {
          userId: payload.userId,
          email: payload.email,
          displayName: payload.displayName
        },
        this.jwtSecret,
        {
          expiresIn: this.jwtExpiresIn,
          issuer: 'auth-service',
          audience: 'aidlc-app'
        }
      );

      logger.debug('Access token generated', {
        userId: payload.userId
      });

      return token;
    } catch (error) {
      logger.error('Failed to generate access token', {
        userId: payload.userId,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Generate opaque refresh token (cryptographically secure random string)
   */
  generateRefreshToken(): string {
    try {
      // Generate 32 bytes (256 bits) of random data
      const token = crypto.randomBytes(32).toString('base64url');

      logger.debug('Refresh token generated');

      return token;
    } catch (error) {
      logger.error('Failed to generate refresh token', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Verify JWT access token signature and expiration
   */
  verifyAccessToken(token: string): TokenPayload | null {
    try {
      const decoded = jwt.verify(token, this.jwtSecret, {
        issuer: 'auth-service',
        audience: 'aidlc-app'
      }) as JWTPayload;

      logger.debug('Access token verified successfully', {
        userId: decoded.userId
      });

      return {
        userId: decoded.userId,
        email: decoded.email,
        displayName: decoded.displayName
      };
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        logger.debug('Access token expired');
      } else if (error instanceof jwt.JsonWebTokenError) {
        logger.warn('Invalid access token', {
          error: error.message
        });
      } else {
        logger.error('Failed to verify access token', {
          error: error instanceof Error ? error.message : String(error)
        });
      }
      return null;
    }
  }

  /**
   * Hash token for secure storage (SHA-256)
   */
  hashToken(token: string): string {
    try {
      const hash = crypto
        .createHash('sha256')
        .update(token)
        .digest('base64url');

      logger.debug('Token hashed successfully');

      return hash;
    } catch (error) {
      logger.error('Failed to hash token', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Compare token with hashed value (constant-time comparison)
   */
  compareTokenHash(token: string, hash: string): boolean {
    try {
      const tokenHash = this.hashToken(token);
      
      // Use crypto.timingSafeEqual for constant-time comparison
      // to prevent timing attacks
      const tokenHashBuffer = Buffer.from(tokenHash, 'base64url');
      const hashBuffer = Buffer.from(hash, 'base64url');

      if (tokenHashBuffer.length !== hashBuffer.length) {
        return false;
      }

      const isMatch = crypto.timingSafeEqual(tokenHashBuffer, hashBuffer);

      logger.debug('Token hash comparison completed', {
        match: isMatch
      });

      return isMatch;
    } catch (error) {
      logger.error('Failed to compare token hash', {
        error: error instanceof Error ? error.message : String(error)
      });
      return false;
    }
  }

  /**
   * Decode JWT without verification (for debugging/logging purposes only)
   */
  decodeToken(token: string): JWTPayload | null {
    try {
      const decoded = jwt.decode(token) as JWTPayload;
      return decoded;
    } catch (error) {
      logger.error('Failed to decode token', {
        error: error instanceof Error ? error.message : String(error)
      });
      return null;
    }
  }
}