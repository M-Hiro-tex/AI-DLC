import rateLimit from 'express-rate-limit';
import { logger } from '../utils/logger';

/**
 * Rate limiter for login endpoints (OAuth initiation)
 * 
 * Limits: 10 requests per 15 minutes per IP
 */
export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 requests per window
  message: {
    error: 'Too Many Requests',
    message: 'Too many login attempts. Please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true, // Return rate limit info in RateLimit-* headers
  legacyHeaders: false, // Disable X-RateLimit-* headers
  handler: (req, res) => {
    logger.warn('Login rate limit exceeded', {
      ip: req.ip,
      path: req.path
    });
    
    res.status(429).json({
      error: 'Too Many Requests',
      message: 'Too many login attempts. Please try again later.',
      retryAfter: '15 minutes'
    });
  }
});

/**
 * Rate limiter for token refresh endpoint
 * 
 * Limits: 20 requests per 15 minutes per IP
 */
export const refreshRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 requests per window
  message: {
    error: 'Too Many Requests',
    message: 'Too many refresh requests. Please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('Refresh rate limit exceeded', {
      ip: req.ip,
      path: req.path
    });
    
    res.status(429).json({
      error: 'Too Many Requests',
      message: 'Too many refresh requests. Please try again later.',
      retryAfter: '15 minutes'
    });
  }
});

/**
 * Rate limiter for profile endpoints
 * 
 * Limits: 100 requests per 15 minutes per IP
 */
export const profileRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: {
    error: 'Too Many Requests',
    message: 'Too many requests. Please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('Profile rate limit exceeded', {
      ip: req.ip,
      path: req.path
    });
    
    res.status(429).json({
      error: 'Too Many Requests',
      message: 'Too many requests. Please try again later.',
      retryAfter: '15 minutes'
    });
  }
});

/**
 * General API rate limiter
 * 
 * Limits: 1000 requests per 15 minutes per IP
 */
export const generalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // 1000 requests per window
  message: {
    error: 'Too Many Requests',
    message: 'Too many requests. Please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('General rate limit exceeded', {
      ip: req.ip,
      path: req.path
    });
    
    res.status(429).json({
      error: 'Too Many Requests',
      message: 'Too many requests. Please try again later.',
      retryAfter: '15 minutes'
    });
  }
});
