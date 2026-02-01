/**
 * Validation utilities for common data formats
 */

/**
 * Email format validation using RFC 5322 simplified pattern
 */
export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') {
    return false;
  }

  // RFC 5322 simplified email pattern
  const emailPattern = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  
  // Additional checks
  if (email.length > 254) return false; // Max email length per RFC
  if (email.includes('..')) return false; // Consecutive dots not allowed
  
  return emailPattern.test(email);
}

/**
 * Display name validation
 * - Must be 1-100 characters
 * - Can contain letters, numbers, spaces, and common punctuation
 * - Cannot start or end with whitespace
 */
export function isValidDisplayName(displayName: string): boolean {
  if (!displayName || typeof displayName !== 'string') {
    return false;
  }

  // Trim to check actual content
  const trimmed = displayName.trim();
  
  // Length check
  if (trimmed.length < 1 || trimmed.length > 100) {
    return false;
  }

  // Check if display name matches original (no leading/trailing whitespace)
  if (trimmed !== displayName) {
    return false;
  }

  // Allow letters (any language), numbers, spaces, and common punctuation
  const displayNamePattern = /^[\p{L}\p{N}\p{Zs}.,'\-!?()]+$/u;
  
  return displayNamePattern.test(displayName);
}

/**
 * JWT token format validation (Basic structure check)
 * - Must have 3 parts separated by dots
 * - Each part must be base64url encoded
 */
export function isValidJwtFormat(token: string): boolean {
  if (!token || typeof token !== 'string') {
    return false;
  }

  // JWT has 3 parts: header.payload.signature
  const parts = token.split('.');
  if (parts.length !== 3) {
    return false;
  }

  // Each part should be base64url encoded (alphanumeric + - and _)
  const base64UrlPattern = /^[A-Za-z0-9_-]+$/;
  
  return parts.every(part => {
    // Each part should have some content
    if (part.length === 0) return false;
    return base64UrlPattern.test(part);
  });
}

/**
 * Refresh token format validation
 * - Must be 32-128 characters
 * - Alphanumeric only
 */
export function isValidRefreshTokenFormat(token: string): boolean {
  if (!token || typeof token !== 'string') {
    return false;
  }

  // Length check
  if (token.length < 32 || token.length > 128) {
    return false;
  }

  // Alphanumeric only
  const refreshTokenPattern = /^[A-Za-z0-9]+$/;
  
  return refreshTokenPattern.test(token);
}

/**
 * OAuth state token format validation
 * - Must be 32-128 characters
 * - Alphanumeric and hyphens
 */
export function isValidOAuthStateFormat(state: string): boolean {
  if (!state || typeof state !== 'string') {
    return false;
  }

  // Length check
  if (state.length < 32 || state.length > 128) {
    return false;
  }

  // Alphanumeric and hyphens
  const statePattern = /^[A-Za-z0-9-]+$/;
  
  return statePattern.test(state);
}

/**
 * URL validation
 */
export function isValidUrl(url: string): boolean {
  if (!url || typeof url !== 'string') {
    return false;
  }

  try {
    const parsed = new URL(url);
    // Only allow http and https protocols
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Sanitize display name by removing excessive whitespace
 */
export function sanitizeDisplayName(displayName: string): string {
  if (!displayName || typeof displayName !== 'string') {
    return '';
  }

  return displayName
    .trim()
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .slice(0, 100); // Enforce max length
}

/**
 * Validation result interface
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Validate user profile data
 */
export function validateUserProfile(data: {
  email?: string;
  displayName?: string;
}): ValidationResult {
  const errors: string[] = [];

  if (data.email !== undefined) {
    if (!isValidEmail(data.email)) {
      errors.push('Invalid email format');
    }
  }

  if (data.displayName !== undefined) {
    if (!isValidDisplayName(data.displayName)) {
      errors.push('Display name must be 1-100 characters and cannot have leading/trailing whitespace');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}