import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

/**
 * Authentication Middleware
 * 
 * Validates JWT tokens and extracts user information from requests.
 * Integrates with U2 Authentication service.
 */

// Extend Express Request to include user property
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email?: string;
        name?: string;
      };
    }
  }
}

/**
 * Middleware to validate JWT token and extract user info
 * 
 * Expected token format: Bearer <token>
 * Token should be validated against U2 Authentication service
 */
export async function authenticateToken(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      res.status(401).json({ error: 'Authorization header missing' });
      return;
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      res.status(401).json({ error: 'Invalid authorization header format' });
      return;
    }

    const token = parts[1];

    // TODO: Integrate with U2 Authentication service to validate token
    // For now, this is a placeholder implementation
    // In production, this should:
    // 1. Call U2 Authentication service to validate token
    // 2. Get user information from the validated token
    // 3. Attach user info to req.user

    // Placeholder: Extract user ID from token (in production, validate properly)
    const decodedUser = await validateTokenWithAuthService(token);

    if (!decodedUser) {
      res.status(401).json({ error: 'Invalid or expired token' });
      return;
    }

    req.user = decodedUser;
    next();
  } catch (error) {
    logger.error('Authentication error', { error });
    res.status(401).json({ error: 'Authentication failed' });
  }
}

/**
 * Validate token with U2 Authentication service
 * 
 * @param token JWT token
 * @returns User information if valid, null otherwise
 */
async function validateTokenWithAuthService(
  token: string
): Promise<{ id: string; email?: string; name?: string } | null> {
  // TODO: Implement actual token validation with U2 Authentication service
  // This should make an HTTP request to U2 service to validate the token
  
  // Placeholder implementation for development
  try {
    // In production, this would be:
    // const response = await fetch('http://u2-auth-service/api/v1/validate-token', {
    //   headers: { Authorization: `Bearer ${token}` }
    // });
    // const data = await response.json();
    // return data.user;

    // For now, just log and return mock user
    logger.info('Validating token (placeholder)', { token: token.substring(0, 10) + '...' });
    
    // Return null to force proper authentication in production
    // In development, you might return a mock user
    return null;
  } catch (error) {
    logger.error('Token validation failed', { error });
    return null;
  }
}

/**
 * Optional authentication middleware
 * Attempts to authenticate but doesn't fail if no token is provided
 */
export async function optionalAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      // No token provided, continue without user
      next();
      return;
    }

    const parts = authHeader.split(' ');
    if (parts.length === 2 && parts[0] === 'Bearer') {
      const token = parts[1];
      const decodedUser = await validateTokenWithAuthService(token);
      
      if (decodedUser) {
        req.user = decodedUser;
      }
    }

    next();
  } catch (error) {
    logger.error('Optional authentication error', { error });
    // Don't fail on optional auth errors
    next();
  }
}
