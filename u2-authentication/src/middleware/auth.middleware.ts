import { Request, Response, NextFunction } from 'express';
import { TokenService } from '../services/token.service';
import { UnauthorizedError } from '../utils/errors';
import { logger } from '../utils/logger';

/**
 * Extended Express Request with user information
 */
export interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    email: string;
    displayName: string;
  };
}

/**
 * Extract Bearer token from Authorization header
 * @param req - Express request
 * @returns JWT token or null
 */
export function extractBearerToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return null;
  }
  
  const parts = authHeader.split(' ');
  
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }
  
  return parts[1];
}

/**
 * Middleware to require authentication
 * Validates JWT and attaches user information to request
 * 
 * Note: This middleware validates the JWT token signature and expiration.
 * For session-based checks (revocation, etc.), use the session service directly in controllers.
 */
export const requireAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Extract token from Authorization header
    const token = extractBearerToken(req);
    
    if (!token) {
      throw new UnauthorizedError('No authentication token provided');
    }
    
    // Verify JWT token signature and expiration
    const tokenService = new TokenService();
    const payload = tokenService.verifyAccessToken(token);
    
    if (!payload) {
      throw new UnauthorizedError('Invalid or expired token');
    }
    
    // Attach user information to request
    req.user = {
      userId: payload.userId,
      email: payload.email,
      displayName: payload.displayName
    };
    
    logger.debug('Authentication successful', {
      userId: payload.userId
    });
    
    next();
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      logger.warn('Authentication failed', { error: error.message });
      res.status(401).json({
        error: 'Unauthorized',
        message: error.message
      });
    } else {
      logger.error('Unexpected error in authentication middleware', { 
        error: error instanceof Error ? error.message : String(error)
      });
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'An unexpected error occurred during authentication'
      });
    }
  }
};

/**
 * Optional authentication middleware
 * Attaches user if valid token provided, but doesn't fail if not
 */
export const optionalAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = extractBearerToken(req);
    
    if (!token) {
      return next();
    }
    
    // Verify JWT token signature and expiration
    const tokenService = new TokenService();
    const payload = tokenService.verifyAccessToken(token);
    
    if (payload) {
      req.user = {
        userId: payload.userId,
        email: payload.email,
        displayName: payload.displayName
      };
    }
    
    next();
  } catch (error) {
    // For optional auth, we don't fail on errors, just continue without user
    logger.debug('Optional auth skipped due to invalid token', { 
      error: error instanceof Error ? error.message : String(error)
    });
    next();
  }
};
